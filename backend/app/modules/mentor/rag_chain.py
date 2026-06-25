import json
import faiss
from typing import AsyncGenerator
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.modules.resume_parser.parser import get_client
from app.modules.job_search.embeddings import embed_text
from app.models.models import DBCareerNote, DBResume
from app.modules.guardrails.input_filter import is_query_safe_and_on_topic
from app.modules.guardrails.grounding import verify_grounding

class CareerNotesStore:
    def __init__(self) -> None:
        self._index: faiss.Index | None = None

    def load(self) -> None:
        index_path = settings.resolve_path(settings.career_notes_faiss_index_path)
        if not index_path.exists():
            print(f"WARNING: Career notes index not found at {index_path}. RAG search is disabled.")
            return
        self._index = faiss.read_index(str(index_path))
        print("Career notes FAISS index loaded successfully.")

    @property
    def is_loaded(self) -> bool:
        return self._index is not None

    def search(self, query_embedding, top_k=3) -> list[tuple[int, float]]:
        if not self.is_loaded or self._index is None:
            return []
        vector = query_embedding.reshape(1, -1)
        distances, indices = self._index.search(vector, top_k)
        return [(int(idx), float(dist)) for idx, dist in zip(indices[0], distances[0]) if idx >= 0]

career_notes_store = CareerNotesStore()

SYSTEM_INSTRUCTION = """
You are a helpful, professional, and encouraging AI Career Mentor.
Your role is to guide the user through career transitions, resume enhancements, job searches, salary negotiation, and interview preparation.

Guidelines:
1. Base your answer on the provided Career Notes Context whenever possible.
2. If the user's resume is provided, review their skills, experience, and target role to tailor your advice specifically to them.
3. If no matching context chunks are found (meaning the grounding check flagged that the question is outside our specific guides), politely note that you are answering from general professional guidelines, and provide helpful generic advice.
4. Keep answers clean, structured (use markdown bullet points, bold text), and actionable.
"""

async def chat_with_mentor(
    query: str,
    session_history: list[dict],
    resume_id: str | None = None,
    db: AsyncSession | None = None,
) -> AsyncGenerator[str, None]:
    """Generates SSE chat events grounding answer in career notes & user resume."""
    # 1. Safety Guardrail: Is query career related?
    is_safe, reason = is_query_safe_and_on_topic(query)
    if not is_safe:
        yield f"data: {json.dumps({'type': 'error', 'text': 'I am your AI Career Mentor and can only answer questions related to resumes, interviews, job hunting, and career development.'})}\n\n"
        return

    # 2. Retrieve career notes via FAISS
    context_chunks = []
    citations = []
    distances = []
    
    if career_notes_store.is_loaded and db is not None:
        try:
            query_emb = embed_text(query)
            search_results = career_notes_store.search(query_emb, top_k=3)
            
            if search_results:
                matched_ids = [idx for idx, _ in search_results]
                distances = [dist for _, dist in search_results]
                
                # Fetch matching documents from database
                res = await db.execute(
                    select(DBCareerNote).where(DBCareerNote.id.in_(matched_ids))
                )
                db_notes = res.scalars().all()
                # Maintain rank order of FAISS search results
                notes_by_id = {note.id: note for note in db_notes}
                
                for idx in matched_ids:
                    if idx in notes_by_id:
                        note = notes_by_id[idx]
                        context_chunks.append(
                            f"Source: {note.title} (file: {note.source_path})\nContent:\n{note.content}"
                        )
                        citations.append({
                            "title": note.title,
                            "source": note.source_path,
                            "snippet": note.content[:200] + "..." if len(note.content) > 200 else note.content
                        })
        except Exception as exc:
            print(f"RAG retrieval error: {exc}")

    # 3. Grounding check
    is_grounded = verify_grounding(distances)
    if not is_grounded:
        # Clear chunks and citations if not grounded to enforce general advice flag
        context_chunks = []
        citations = []
        grounding_instruction = "\nNote: There are no specific guidelines in our local database for this query. Provide general, helpful professional advice instead."
    else:
        grounding_instruction = ""

    # 4. Resume personalization
    resume_info = ""
    if resume_id and db is not None:
        res = await db.execute(
            select(DBResume).where(DBResume.id == resume_id)
        )
        db_resume = res.scalar_one_or_none()
        if db_resume:
            r = db_resume.parsed_json
            resume_info = (
                f"\nUser Resume Profile Info:\n"
                f"- Name: {r.get('name', 'N/A')}\n"
                f"- Target Role: {r.get('target_role', 'N/A')}\n"
                f"- Total Work Experience: {r.get('total_experience_years', 'N/A')} years\n"
                f"- Skills: {', '.join(r.get('skills', []))}\n"
                f"- Profile Summary: {r.get('summary', 'N/A')}\n"
            )

    # 5. Build prompt with context, resume, history, and query
    context_str = "\n\n".join(context_chunks) if context_chunks else "No specific guides available."
    
    # Format chat history
    history_str = ""
    for msg in session_history:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        history_str += f"{role_label}: {msg['content']}\n"
        
    full_prompt = (
        f"Career Notes Context:\n{context_str}\n"
        f"{grounding_instruction}\n"
        f"{resume_info}\n"
        f"Conversation History:\n{history_str}"
        f"User: {query}\n"
        f"Assistant:"
    )

    # 6. Yield citations first
    yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

    # 7. Generate stream
    client = get_client()
    try:
        response_stream = client.models.generate_content_stream(
            model=settings.gemini_llm_model,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.4,
            )
        )
        for chunk in response_stream:
            if chunk.text:
                yield f"data: {json.dumps({'type': 'content', 'text': chunk.text})}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'text': f'Generation error: {str(exc)}'})}\n\n"
