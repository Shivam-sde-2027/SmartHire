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


@router.get("")
def list_jobs(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    q: str = Query(None, description="Search keyword for job title, skills, or keywords"),
    experience_level: str = Query(None, description="Filter by experience level"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500)
):
    if not job_store.is_loaded:
        raise HTTPException(status_code=503, detail="Job index not loaded.")
        
    filtered_jobs = job_store._metadata
    
    if q:
        q_lower = q.lower()
        filtered_jobs = [
            j for j in filtered_jobs
            if q_lower in str(j.get("title", "")).lower()
            or q_lower in str(j.get("skills", "")).lower()
            or q_lower in str(j.get("keywords", "")).lower()
        ]
        
    if experience_level:
        exp_lower = experience_level.lower()
        filtered_jobs = [
            j for j in filtered_jobs
            if exp_lower in str(j.get("experience_level", "")).lower()
        ]
        
    total = len(filtered_jobs)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_jobs = filtered_jobs[start_idx:end_idx]
    
    # Standardize dictionary keys to match JobMatchResult structure where possible
    result_jobs = []
    for j in paginated_jobs:
        result_jobs.append({
            "job_id": str(j.get("job_id", "")),
            "title": str(j.get("title", "")),
            "experience_level": str(j.get("experience_level", "")),
            "years_of_experience": str(j.get("years_of_experience", "")),
            "skills": str(j.get("skills", "")),
            "responsibilities": str(j.get("responsibilities", "")),
            "keywords": str(j.get("keywords", ""))
        })
        
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "jobs": result_jobs
    }


@router.get("/{job_id}")
def get_job(
    job_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    if not job_store.is_loaded:
        raise HTTPException(status_code=503, detail="Job index not loaded.")
    job = job_store.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post("/match", response_model=JobMatchResponse)
def match_jobs(
    body: MatchFromProfileRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    if not job_store.is_loaded:
        raise HTTPException(status_code=503, detail="Job index not loaded.")
    matches = match_jobs_for_profile(body.profile, top_k=body.top_k)
    return JobMatchResponse(
        matches=[JobMatchResult.model_validate(m.__dict__) for m in matches],
        top_k=body.top_k,
    )
