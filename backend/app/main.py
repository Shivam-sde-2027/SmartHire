from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.modules.job_search.faiss_store import job_store
from app.modules.mentor.rag_chain import career_notes_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        job_store.load()
        print(f"Loaded job index with {len(job_store._metadata)} jobs.")
    except FileNotFoundError as exc:
        print(f"WARNING: {exc}")
        
    try:
        career_notes_store.load()
    except FileNotFoundError as exc:
        print(f"WARNING: {exc}")
        
    yield


app = FastAPI(title="SmartHire GenAI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "job_index_loaded": job_store.is_loaded,
        "auth_enabled": settings.auth_enabled,
    }
