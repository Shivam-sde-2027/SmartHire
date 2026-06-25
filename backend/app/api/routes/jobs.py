from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import CurrentUser, get_current_user
from app.modules.job_search.faiss_store import job_store
from app.modules.job_search.service import match_jobs_for_profile
from app.schemas.jobs import JobMatchResponse, JobMatchResult, MatchFromProfileRequest

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/health")
def jobs_health():
    return {"index_loaded": job_store.is_loaded, "job_count": job_store.job_count}


@router.get("/{job_id}")
def get_job(
    job_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    job = job_store.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post("/match", response_model=JobMatchResponse)
def match_jobs(
    body: MatchFromProfileRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    matches = match_jobs_for_profile(body.profile, top_k=body.top_k)
    return JobMatchResponse(
        matches=[JobMatchResult.model_validate(m.__dict__) for m in matches],
        top_k=body.top_k,
    )
