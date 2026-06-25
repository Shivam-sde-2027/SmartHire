import datetime
import json
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.models import DBChatSession, DBChatMessage
from app.modules.mentor.rag_chain import chat_with_mentor

router = APIRouter(prefix="/mentor", tags=["mentor"])

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    resume_id: Optional[str] = None

@router.post("/chat")
async def mentor_chat(
    body: ChatRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # 1. Resolve or create chat session
    session_id = body.session_id
    session_title = ""
    
    if not session_id:
        session_id = str(uuid.uuid4())
        session_title = body.query[:40] + "..." if len(body.query) > 40 else body.query
        db_session = DBChatSession(
            id=session_id,
            user_id=user.user_id,
            title=session_title,
            created_at=datetime.datetime.utcnow()
        )
        db.add(db_session)
        await db.commit()
    else:
        # Check session ownership
        sess_res = await db.execute(
            select(DBChatSession).where(
                DBChatSession.id == session_id,
                DBChatSession.user_id == user.user_id
            )
        )
        db_session = sess_res.scalar_one_or_none()
        if not db_session:
            raise HTTPException(status_code=404, detail="Chat session not found.")
        session_title = db_session.title

    # 2. Retrieve history (last 10 messages)
    msg_res = await db.execute(
        select(DBChatMessage)
        .where(DBChatMessage.session_id == session_id)
        .order_by(DBChatMessage.created_at.asc())
        .limit(20) # get up to 20 messages (10 turns)
    )
    db_messages = msg_res.scalars().all()
    history_list = [{"role": msg.role, "content": msg.content} for msg in db_messages]

    # 3. Create SSE Stream generator
    async def sse_generator():
        # Yield metadata about the session first (so frontend gets the session_id / title)
        yield f"data: {json.dumps({'type': 'session_metadata', 'session_id': session_id, 'title': session_title})}\n\n"
        
        full_response_text = ""
        citations_saved = []
        is_error = False
        
        async for sse_chunk in chat_with_mentor(body.query, history_list, body.resume_id, db):
            if sse_chunk.startswith("data: "):
                try:
                    payload = json.loads(sse_chunk[6:].strip())
                    if payload.get("type") == "content":
                        full_response_text += payload.get("text", "")
                    elif payload.get("type") == "citations":
                        citations_saved = payload.get("citations", [])
                    elif payload.get("type") == "error":
                        is_error = True
                except Exception:
                    pass
            yield sse_chunk

        # Save conversation turn to database (only if there was no generation error)
        if not is_error and full_response_text.strip():
            try:
                user_msg = DBChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="user",
                    content=body.query,
                    created_at=datetime.datetime.utcnow()
                )
                asst_msg = DBChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="assistant",
                    content=full_response_text,
                    citations=citations_saved,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(user_msg)
                db.add(asst_msg)
                await db.commit()
            except Exception as e:
                print(f"Failed to save messages to DB: {e}")

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/sessions")
async def list_chat_sessions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DBChatSession).where(DBChatSession.user_id == user.user_id).order_by(DBChatSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat()
        }
        for s in sessions
    ]

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Ensure ownership
    sess_res = await db.execute(
        select(DBChatSession).where(
            DBChatSession.id == session_id,
            DBChatSession.user_id == user.user_id
        )
    )
    db_session = sess_res.scalar_one_or_none()
    if not db_session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    msg_res = await db.execute(
        select(DBChatMessage)
        .where(DBChatMessage.session_id == session_id)
        .order_by(DBChatMessage.created_at.asc())
    )
    db_messages = msg_res.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": m.citations,
            "created_at": m.created_at.isoformat()
        }
        for m in db_messages
    ]
