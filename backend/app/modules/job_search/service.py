from app.modules.job_search.embeddings import embed_text
from app.modules.job_search.faiss_store import JobMatch, job_store
from app.modules.job_search.profile_text import build_profile_text
from app.modules.resume_parser.schemas import Resume


def match_jobs_for_profile(resume: Resume, top_k: int = 10) -> list[JobMatch]:
    profile_text = build_profile_text(resume)
    embedding = embed_text(profile_text)
    return job_store.search(embedding, top_k=top_k)
