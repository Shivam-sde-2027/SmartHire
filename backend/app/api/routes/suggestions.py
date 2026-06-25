import datetime
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.models import DBResume, DBJob, DBCVSuggestion
from app.modules.cv_suggestions.generator import generate_cv_suggestions
from app.modules.job_search.faiss_store import job_store
from app.modules.resume_parser.schemas import Resume

router = APIRouter(prefix="/suggestions", tags=["suggestions"])

class GenerateSuggestionsRequest(BaseModel):
    resume_id: str
    job_id: Optional[str] = None
    job_description: Optional[str] = None

@router.post("/generate")
async def generate_suggestions(
    body: GenerateSuggestionsRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Retrieve the resume from database
    resume_res = await db.execute(
        select(DBResume).where(DBResume.id == body.resume_id, DBResume.user_id == user.user_id)
    )
    db_resume = resume_res.scalar_one_or_none()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    resume_profile = Resume.model_validate(db_resume.parsed_json)
    
    # Resolve job description
    target_job_desc = ""
    if body.job_id:
        # Check cache in DB
        cache_res = await db.execute(
            select(DBCVSuggestion).where(
                DBCVSuggestion.resume_id == body.resume_id,
                DBCVSuggestion.job_id == body.job_id,
                DBCVSuggestion.user_id == user.user_id
            )
        )
        cached_suggestion = cache_res.scalar_one_or_none()
        if cached_suggestion:
            return {
                "id": cached_suggestion.id,
                "suggestions": cached_suggestion.suggestions,
                "created_at": cached_suggestion.created_at.isoformat()
            }

        # Get job description from DB if available
        job_res = await db.execute(
            select(DBJob).where(DBJob.job_id == body.job_id)
        )
        db_job = job_res.scalar_one_or_none()
        if db_job:
            target_job_desc = f"Title: {db_job.title}\nSkills: {db_job.skills}\nResponsibilities: {db_job.responsibilities}\nKeywords: {db_job.keywords}"
        else:
            # Fallback to FAISS metadata if DB row is not present
            metadata_job = job_store.get_by_id(body.job_id)
            if not metadata_job:
                raise HTTPException(status_code=404, detail="Target job not found.")
            target_job_desc = (
                f"Title: {metadata_job.get('title', '')}\n"
                f"Skills: {metadata_job.get('skills', '')}\n"
                f"Responsibilities: {metadata_job.get('responsibilities', '')}\n"
                f"Keywords: {metadata_job.get('keywords', '')}"
            )
    elif body.job_description:
        target_job_desc = body.job_description
    else:
        raise HTTPException(status_code=400, detail="Either job_id or job_description must be provided.")
        
    # Generate suggestions via Gemini
    try:
        suggestions_res = generate_cv_suggestions(resume_profile, target_job_desc)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate CV suggestions: {str(exc)}")
        
    suggestion_id = str(uuid.uuid4())
    db_suggestion = DBCVSuggestion(
        id=suggestion_id,
        user_id=user.user_id,
        resume_id=body.resume_id,
        job_id=body.job_id,
        suggestions=suggestions_res.model_dump(),
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_suggestion)
    await db.commit()
    
    return {
        "id": suggestion_id,
        "suggestions": suggestions_res.model_dump(),
        "created_at": db_suggestion.created_at.isoformat()
    }

@router.get("/{suggestion_id}")
async def get_suggestion(
    suggestion_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DBCVSuggestion).where(
            DBCVSuggestion.id == suggestion_id,
            DBCVSuggestion.user_id == user.user_id
        )
    )
    db_suggestion = result.scalar_one_or_none()
    if not db_suggestion:
        raise HTTPException(status_code=404, detail="CV suggestions not found.")
        
    return {
        "id": db_suggestion.id,
        "resume_id": db_suggestion.resume_id,
        "job_id": db_suggestion.job_id,
        "suggestions": db_suggestion.suggestions,
        "created_at": db_suggestion.created_at.isoformat()
    }

@router.get("")
async def list_suggestions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DBCVSuggestion).where(DBCVSuggestion.user_id == user.user_id).order_by(DBCVSuggestion.created_at.desc())
    )
    suggestions = result.scalars().all()
    return [
        {
            "id": s.id,
            "resume_id": s.resume_id,
            "job_id": s.job_id,
            "created_at": s.created_at.isoformat()
        }
        for s in suggestions
    ]
