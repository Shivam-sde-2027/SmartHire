import asyncio
import pickle
import sys
from pathlib import Path

# Add backend folder to path so we can import app modules
sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import settings
from app.models.models import DBJob
from app.core.database import engine, async_session
from sqlalchemy import select

async def seed_jobs():
    meta_path = settings.job_meta_path
    if not meta_path.exists():
        print(f"Error: Job metadata file not found at {meta_path}. Run build_job_index.py first.")
        sys.exit(1)
        
    print(f"Loading metadata from {meta_path}...")
    with meta_path.open("rb") as f:
        job_metadata = pickle.load(f)
        
    print(f"Loaded {len(job_metadata)} jobs. Connecting to database to seed...")
    
    async with async_session() as session:
        async with session.begin():
            # Check existing jobs to avoid duplicate entries
            result = await session.execute(select(DBJob.job_id))
            existing_job_ids = set(result.scalars().all())
            
            jobs_to_add = []
            for job in job_metadata:
                job_id = str(job.get("job_id", ""))
                if job_id in existing_job_ids:
                    continue
                
                db_job = DBJob(
                    id=job.get("index"), # Maps directly to FAISS index row
                    job_id=job_id,
                    title=job.get("title", ""),
                    experience_level=job.get("experience_level", ""),
                    years_of_experience=str(job.get("years_of_experience", "")),
                    skills=job.get("skills", ""),
                    responsibilities=job.get("responsibilities", ""),
                    keywords=job.get("keywords", ""),
                    search_text=job.get("search_text", ""),
                    faiss_index=job.get("index")
                )
                jobs_to_add.append(db_job)
                
            if jobs_to_add:
                print(f"Adding {len(jobs_to_add)} new jobs to the 'jobs' table...")
                session.add_all(jobs_to_add)
                print(f"Committed {len(jobs_to_add)} jobs successfully.")
            else:
                print("All jobs are already present in the database.")
                
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_jobs())
