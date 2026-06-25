import pickle
from dataclasses import dataclass

import faiss
import numpy as np

from app.core.config import settings


@dataclass
class JobMatch:
    rank: int
    job_id: str
    title: str
    experience_level: str
    years_of_experience: str
    skills: str
    responsibilities: str
    keywords: str
    match_score: float


class JobSearchStore:
    def __init__(self) -> None:
        self._index: faiss.Index | None = None
        self._metadata: list[dict] = []

    def load(self) -> None:
        index_path = settings.job_index_path
        meta_path = settings.job_meta_path

        if not index_path.exists():
            raise FileNotFoundError(
                f"FAISS index not found at {index_path}. "
                "Run: python scripts/build_job_index.py"
            )
        if not meta_path.exists():
            raise FileNotFoundError(f"Job metadata not found at {meta_path}.")

        self._index = faiss.read_index(str(index_path))
        with meta_path.open("rb") as f:
            self._metadata = pickle.load(f)

    @property
    def is_loaded(self) -> bool:
        return self._index is not None and bool(self._metadata)

    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> list[JobMatch]:
        if not self.is_loaded or self._index is None:
            raise RuntimeError("Job search index is not loaded.")

        vector = query_embedding.astype(np.float32).reshape(1, -1)
        distances, indices = self._index.search(vector, top_k)

        top_distances = distances[0]
        max_dist = float(np.max(top_distances))
        min_dist = float(np.min(top_distances))

        results: list[JobMatch] = []
        for rank, (idx, dist) in enumerate(zip(indices[0], top_distances), start=1):
            if idx < 0:
                continue
            job = self._metadata[idx]
            score = 100.0 * (1.0 - ((float(dist) - min_dist) / (max_dist - min_dist + 1e-8)))
            results.append(
                JobMatch(
                    rank=rank,
                    job_id=str(job.get("job_id", "")),
                    title=str(job.get("title", "")),
                    experience_level=str(job.get("experience_level", "")),
                    years_of_experience=str(job.get("years_of_experience", "")),
                    skills=str(job.get("skills", "")),
                    responsibilities=str(job.get("responsibilities", "")),
                    keywords=str(job.get("keywords", "")),
                    match_score=round(score, 2),
                )
            )
        return results

    @property
    def job_count(self) -> int:
        return len(self._metadata)

    def get_by_id(self, job_id: str) -> dict | None:
        for job in self._metadata:
            if str(job.get("job_id")) == job_id:
                return job
        return None


job_store = JobSearchStore()
