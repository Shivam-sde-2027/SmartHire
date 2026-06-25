"""
Build FAISS index for career notes and seed chunks into PostgreSQL.
Run from project root:
  python scripts/build_career_notes_index.py
"""
import os
import sys
import time
from pathlib import Path

# Add backend folder to path so we can import app modules
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT / "backend"))

import faiss
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from sqlalchemy import delete

from app.core.config import settings
from app.models.models import DBCareerNote
from app.core.database import engine, async_session

load_dotenv(PROJECT_ROOT / "backend" / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
NOTES_DIR = PROJECT_ROOT / "data" / "career_notes"
INDEX_PATH = PROJECT_ROOT / "data" / "indexes" / "career_notes_faiss.index"

if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set in backend/.env")
    sys.exit(1)

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        if end == text_len:
            break
        start += chunk_size - overlap
    return chunks

def embed_with_retry(client: genai.Client, text: str) -> list[float]:
    while True:
        try:
            result = client.models.embed_content(model=EMBEDDING_MODEL, contents=text)
            return result.embeddings[0].values
        except genai_errors.ClientError as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                print("\nRate limit hit. Waiting 30s before retry...")
                time.sleep(30)
                continue
            raise

async def main():
    client = genai.Client(api_key=API_KEY)
    
    # 1. Read files and chunk
    documents = []
    print("Reading and chunking markdown guides...")
    for file_path in NOTES_DIR.glob("*.md"):
        title = file_path.stem.replace("_", " ").title()
        with file_path.open("r", encoding="utf-8") as f:
            content = f.read()
        
        chunks = chunk_text(content)
        print(f"File: {file_path.name} | Size: {len(content)} chars | Chunks: {len(chunks)}")
        for idx, chunk in enumerate(chunks):
            documents.append({
                "title": title,
                "content": chunk,
                "source_path": str(file_path.relative_to(PROJECT_ROOT)),
                "chunk_index": idx
            })
            
    if not documents:
        print("No career notes markdown files found. Exiting.")
        return
        
    # 2. Get Embeddings
    print(f"Generating embeddings for {len(documents)} chunks...")
    embeddings = []
    for doc in documents:
        emb = embed_with_retry(client, doc["content"])
        embeddings.append(emb)
        time.sleep(0.5) # small delay
        
    vectors = np.array(embeddings, dtype=np.float32)
    print(f"Embeddings generated with shape: {vectors.shape}")
    
    # 3. Create and save FAISS index
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)
    
    # Ensure indexes folder exists
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(INDEX_PATH))
    print(f"Saved FAISS index -> {INDEX_PATH}")
    
    # 4. Seed metadata chunks in database
    print("Seeding chunks to the 'career_notes' PostgreSQL table...")
    async with async_session() as session:
        async with session.begin():
            # Clear old career notes to avoid duplicates
            await session.execute(delete(DBCareerNote))
            
            db_notes = []
            for idx, doc in enumerate(documents):
                db_note = DBCareerNote(
                    id=idx, # Matches the row index of FAISS
                    title=doc["title"],
                    content=doc["content"],
                    source_path=doc["source_path"],
                    chunk_index=doc["chunk_index"]
                )
                db_notes.append(db_note)
            session.add_all(db_notes)
            print(f"Seeded {len(db_notes)} career notes successfully.")
            
    await engine.dispose()
    print("Process complete!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
