from fastapi import APIRouter

from app.api.routes import jobs, resumes, suggestions, mentor

api_router = APIRouter()
api_router.include_router(resumes.router)
api_router.include_router(jobs.router)
api_router.include_router(suggestions.router)
api_router.include_router(mentor.router)


