from typing import Optional
from pydantic import BaseModel, Field

from app.modules.resume_parser.schemas import Resume


class ResumeParseResponse(BaseModel):
    id: Optional[str] = None
    profile: Resume
    profile_text: str


class JobMatchResult(BaseModel):
    rank: int
    job_id: str
    title: str
    experience_level: str
    years_of_experience: str
    skills: str
    responsibilities: str
    keywords: str
    match_score: float


class JobMatchResponse(BaseModel):
    matches: list[JobMatchResult]
    top_k: int


class MatchFromProfileRequest(BaseModel):
    profile: Resume
    top_k: int = Field(default=10, ge=1, le=50)
