from typing import Optional

from pydantic import BaseModel, Field


class Education(BaseModel):
    degree: Optional[str] = None
    institute: Optional[str] = None
    year: Optional[str] = None
    score: Optional[str] = None


class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    highlights: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tech_stack: list[str] = Field(default_factory=list)


class Resume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    education: list[Education] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    total_experience_years: Optional[float] = None
    summary: Optional[str] = None
    target_role: Optional[str] = None
