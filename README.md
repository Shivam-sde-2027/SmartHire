# SmartHire GenAI

SmartHire GenAI is a career portal that provides intelligent resume parsing, semantic job matching, resume (CV) improvement suggestions and a custom career mentor chatbot powered by Retrieval-Augmented Generation (RAG).

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
├── backend/          # FastAPI API + AI modules (parser, search, suggestion, mentor, guardrails)
├── frontend/         # React SPA (dashboard, jobs, suggestions, mentor, settings, auth pages)
├── data/             # Job dataset, career notes, FAISS indexes (gitignored large files)
├── docs/             # Design docs, architecture documentation, evaluation report
└── scripts/          # Administrative utilities (index build, eval)
```

## Quick Start & Local Setup

For detailed installation, configuration, and environment setup instructions, refer to **[docs/SETUP.md](file:///d:/Project/rp2/docs/SETUP.md)**.

### Running the Services

1. **Build Job Vector Index** (One-time setup to build local FAISS indexes):
   ```powershell
   .\backend\.venv\Scripts\python scripts\build_job_index.py
   ```

2. **Run Backend Server**:
   ```powershell
   cd backend
   ./.venv/Scripts/uvicorn app.main:app --reload --port 8000
   ```

3. **Run Frontend App**:
   ```powershell
   cd frontend
   npm run dev
   ```

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and fill in the required API keys (Gemini API keys, database connection strings, Supabase credentials, etc.) before starting.

## Project Modules

| # | Module | Reference Code Location |
|---|--------|-------------------------|
| 1 | **Resume Parser** | [resume_parser](file:///d:/Project/rp2/backend/app/modules/resume_parser/) |
| 2 | **Semantic Job Search** | [job_search](file:///d:/Project/rp2/backend/app/modules/job_search/) |
| 3 | **CV Improvement Generator** | [cv_suggestions](file:///d:/Project/rp2/backend/app/modules/cv_suggestions/) |
| 4 | **AI Career Mentor (RAG)** | [mentor](file:///d:/Project/rp2/backend/app/modules/mentor/) |
| 5 | **Safety Guardrails** | [guardrails](file:///d:/Project/rp2/backend/app/modules/guardrails/) |
| 6 | **React Portal UI & Deployment** | [frontend](file:///d:/Project/rp2/frontend/) |

## Documentation

For a deep dive into the system's design, database schemas, SSE streaming, RAG pipelines and API specifications, see **[docs/ARCHITECTURE.md](file:///d:/Project/rp2/docs/ARCHITECTURE.md)**.
