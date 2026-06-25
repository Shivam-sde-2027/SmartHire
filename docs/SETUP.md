# Phase 1 Setup & Run Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- Free disk space (~500 MB for Python packages)
- `GEMINI_API_KEY` in `backend/.env`
- Supabase keys in `backend/.env` and `frontend/.env`

## 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

Add to `backend/.env` (minimum):

```env
GEMINI_API_KEY=...
SUPABASE_JWT_SECRET=...   # from Supabase → Settings → API → JWT Secret
CORS_ORIGINS=http://localhost:5173
```

## 2. Build FAISS job index (one-time, ~1067 API calls)

```powershell
cd d:\Project\rp2
.\backend\.venv\Scripts\python scripts\build_job_index.py
```

Output:
- `data/indexes/job_faiss.index`
- `data/indexes/job_metadata.pkl`

## 3. Start API

```powershell
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/health

## 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

## API Endpoints (Phase 1)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/resumes/upload` | Parse resume only |
| POST | `/api/resumes/upload-and-match` | Parse + top job matches |
| POST | `/api/resumes/match` | Match from parsed JSON |
| GET | `/api/jobs/{job_id}` | Job detail |
| GET | `/health` | Server status |

All `/api/*` routes require `Authorization: Bearer <supabase_access_token>` when `SUPABASE_JWT_SECRET` is set.

## Troubleshooting

**`No space left on device` during pip install**
- Free disk space, then: `pip cache purge` and reinstall.

**`FAISS index not found`**
- Run `scripts/build_job_index.py` first.

**401 Unauthorized**
- Sign in on frontend; ensure `SUPABASE_JWT_SECRET` matches your Supabase project.

**Email confirmation required**
- In Supabase → Authentication → Providers → Email, disable "Confirm email" for dev, or confirm via email link.
