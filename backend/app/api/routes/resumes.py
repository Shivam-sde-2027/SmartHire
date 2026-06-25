import datetime
import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.models import DBResume
from app.modules.job_search.service import match_jobs_for_profile
from app.modules.resume_parser.extractor import extract_text_from_upload
from app.modules.resume_parser.parser import parse_resume
from app.modules.job_search.profile_text import build_profile_text
from app.modules.resume_parser.schemas import Resume
from app.schemas.jobs import JobMatchResponse, JobMatchResult, MatchFromProfileRequest, ResumeParseResponse

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeParseResponse)
async def upload_resume(
    file: Annotated[UploadFile, File(...)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    resume_text = await extract_text_from_upload(file, max_bytes=settings.upload_max_bytes)
    profile = parse_resume(resume_text)
    profile_text = build_profile_text(profile)
    
    resume_id = str(uuid.uuid4())
    text_hash = hashlib.sha256(resume_text.encode("utf-8")).hexdigest()
    
    db_resume = DBResume(
        id=resume_id,
        user_id=user.user_id,
        file_path=file.filename,
        raw_text_hash=text_hash,
        parsed_json=profile.model_dump(),
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_resume)
    await db.commit()
    
    # Return response containing the saved ID
    response_data = ResumeParseResponse(profile=profile, profile_text=profile_text)
    # We can inject the ID dynamically into the response dict
    res = response_data.model_dump()
    res["id"] = resume_id
    return res


@router.post("/upload-and-match")
async def upload_and_match(
    file: Annotated[UploadFile, File(...)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    top_k: Annotated[int, Form()] = 10,
):
    if top_k < 1 or top_k > 50:
        raise HTTPException(status_code=400, detail="top_k must be between 1 and 50.")

    resume_text = await extract_text_from_upload(file, max_bytes=settings.upload_max_bytes)
    profile = parse_resume(resume_text)
    matches = match_jobs_for_profile(profile, top_k=top_k)
    profile_text = build_profile_text(profile)

    resume_id = str(uuid.uuid4())
    text_hash = hashlib.sha256(resume_text.encode("utf-8")).hexdigest()
    
    db_resume = DBResume(
        id=resume_id,
        user_id=user.user_id,
        file_path=file.filename,
        raw_text_hash=text_hash,
        parsed_json=profile.model_dump(),
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_resume)
    await db.commit()

    return {
        "id": resume_id,
        "profile": profile,
        "profile_text": profile_text,
        "matches": [JobMatchResult.model_validate(m.__dict__) for m in matches],
        "top_k": top_k,
    }


@router.post("/match", response_model=JobMatchResponse)
def match_from_profile(
    body: MatchFromProfileRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    matches = match_jobs_for_profile(body.profile, top_k=body.top_k)
    return JobMatchResponse(
        matches=[JobMatchResult.model_validate(m.__dict__) for m in matches],
        top_k=body.top_k,
    )


@router.get("", response_model=list[dict])
async def list_resumes(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DBResume).where(DBResume.user_id == user.user_id).order_by(DBResume.created_at.desc())
    )
    resumes = result.scalars().all()
    return [
        {
            "id": r.id,
            "file_path": r.file_path,
            "created_at": r.created_at.isoformat(),
            "profile": r.parsed_json,
        }
        for r in resumes
    ]


@router.get("/{resume_id}", response_model=dict)
async def get_resume(
    resume_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DBResume).where(DBResume.id == resume_id, DBResume.user_id == user.user_id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return {
        "id": resume.id,
        "file_path": resume.file_path,
        "created_at": resume.created_at.isoformat(),
        "profile": resume.parsed_json,
    }
