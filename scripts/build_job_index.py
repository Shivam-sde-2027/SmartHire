"""
Build FAISS index from job_dataset_cleaned.csv.
Supports resume + retry on rate limits.

Run from project root:
  python scripts/build_job_index.py
"""
from __future__ import annotations

import os
import pickle
import sys
import time
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DATA_CSV = PROJECT_ROOT / "data" / "raw" / "job_dataset_cleaned.csv"
INDEX_DIR = PROJECT_ROOT / "data" / "indexes"
INDEX_PATH = INDEX_DIR / "job_faiss.index"
METADATA_PATH = INDEX_DIR / "job_metadata.pkl"
CHECKPOINT_PATH = INDEX_DIR / "embedding_checkpoint.pkl"

load_dotenv(BACKEND_ROOT / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
REQUEST_DELAY_SEC = float(os.getenv("EMBED_REQUEST_DELAY_SEC", "0.5"))
MAX_JOBS = int(os.getenv("MAX_JOBS", "500"))  # 0 = all jobs

if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set in backend/.env")
    sys.exit(1)

if not DATA_CSV.exists():
    print(f"ERROR: Dataset not found at {DATA_CSV}")
    sys.exit(1)


def load_checkpoint() -> tuple[list[list[float]], list[dict]]:
    if not CHECKPOINT_PATH.exists():
        return [], []
    with CHECKPOINT_PATH.open("rb") as f:
        data = pickle.load(f)
    print(f"Resuming from checkpoint: {len(data['embeddings'])} embeddings already done.")
    return data["embeddings"], data["metadata"]


def save_checkpoint(embeddings: list[list[float]], metadata: list[dict]) -> None:
    with CHECKPOINT_PATH.open("wb") as f:
        pickle.dump({"embeddings": embeddings, "metadata": metadata}, f)


def embed_with_retry(client: genai.Client, text: str) -> list[float]:
    while True:
        try:
            result = client.models.embed_content(model=EMBEDDING_MODEL, contents=text)
            return result.embeddings[0].values
        except genai_errors.ClientError as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                wait = 45
                print(f"\nRate limit hit. Waiting {wait}s before retry...")
                time.sleep(wait)
                continue
            raise


def main() -> None:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    client = genai.Client(api_key=API_KEY)
    df = pd.read_csv(DATA_CSV)
    if MAX_JOBS > 0:
        df = df.head(MAX_JOBS)
    print(f"Embedding {len(df)} jobs from {DATA_CSV.name}")

    embeddings, job_metadata = load_checkpoint()
    start_idx = len(embeddings)

    if start_idx >= len(df):
        print("Checkpoint already has all embeddings. Building index...")
    else:
        rows = list(df.iterrows())[start_idx:]
        for idx, row in tqdm(rows, total=len(rows), desc="Embedding jobs", initial=0):
            text = str(row["search_text"])
            embedding = embed_with_retry(client, text)
            embeddings.append(embedding)
            job_metadata.append(
                {
                    "index": int(idx),
                    "job_id": row["JobID"],
                    "title": row["Title"],
                    "experience_level": row["ExperienceLevel"],
                    "years_of_experience": row["YearsOfExperience"],
                    "skills": row["Skills"],
                    "responsibilities": row["Responsibilities"],
                    "keywords": row["Keywords"],
                    "search_text": text,
                }
            )
            if len(embeddings) % 25 == 0:
                save_checkpoint(embeddings, job_metadata)
            time.sleep(REQUEST_DELAY_SEC)

        save_checkpoint(embeddings, job_metadata)

    vectors = np.array(embeddings, dtype=np.float32)
    print(f"Embedding shape: {vectors.shape}")

    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)

    faiss.write_index(index, str(INDEX_PATH))
    with METADATA_PATH.open("wb") as f:
        pickle.dump(job_metadata, f)

    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()

    print(f"Saved FAISS index -> {INDEX_PATH}")
    print(f"Saved metadata   -> {METADATA_PATH}")
    print(f"Vectors stored: {index.ntotal}")


if __name__ == "__main__":
    main()
