# SmartHire GenAI

End-to-end career portal: resume parsing, semantic job matching, CV improvement suggestions, and RAG-based AI Career Mentor.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) + TypeScript |
| Backend | FastAPI (Python) |
| Auth | Supabase Auth |
| Database | PostgreSQL (via Supabase) |
| Vector Search | FAISS (job + career-notes indexes) |
| LLM / Embeddings | Google Gemini (`gemini-2.5-flash`, `gemini-embedding-001`) |

## Repository Layout

```
rp2/
├── backend/          # FastAPI API + AI modules
├── frontend/       # React SPA
├── data/           # Job dataset, career notes, FAISS indexes (gitignored large files)
├── docs/           # Design docs, evaluation report
└── scripts/        # One-off utilities (index build, eval)
```

## Quick Start (after setup)

See **[docs/SETUP.md](docs/SETUP.md)** for full instructions.

```powershell
# 1. Build job index (one-time)
.\backend\.venv\Scripts\python scripts\build_job_index.py

# 2. Backend
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm run dev
```

## Environment

Copy `backend/.env.example` → `backend/.env` and fill in keys.

## Modules

| # | Module | Status |
|---|--------|--------|
| 1 | Resume Parser | Done — `backend/app/modules/resume_parser/` |
| 2 | Semantic Job Search | Done — `backend/app/modules/job_search/` |
| 3 | CV Improvement Generator | Planned |
| 4 | AI Career Mentor (RAG) | Planned |
| 5 | Guardrails | Planned |
| 6 | React Portal + Deploy | Phase 1 UI done (auth + upload + matches) |

See `docs/ARCHITECTURE.md` for full design.
