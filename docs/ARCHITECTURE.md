# SmartHire GenAI — Architecture & Build Plan

## 1. How Your Reference Code Maps to the App

### Module 1 — Resume Parser (your code)

| Your code | Production integration |
|-----------|------------------------|
| `extract_text_from_pdf` (PyMuPDF) | Extend with DOCX via `python-docx`; called from upload endpoint |
| `parse_resume` + Pydantic `Resume` schema | Core service; schema becomes API response contract |
| `run_sanity_check` | Post-parse validation layer before DB save |
| Gemini structured JSON output | Keep; add retry on invalid JSON (max 2 retries) |

**Fixes needed before integration:**
- `Resume` model has indentation bug (`education`, `skills` etc. must be class fields)
- `if __name__ == "main"` → `if __name__ == "__main__"`
- Resume text builder uses `institution`/`title` but parser schema uses `institute`/`role` — unify field names
- Add `target_role` field (required by project spec)

### Module 2 — Job Search (your code)

| Your code | Production integration |
|-----------|------------------------|
| `jobs_cleaned.csv` + `search_text` column | Loaded once; metadata in Postgres, vectors in FAISS |
| `gemini-embedding-001` embeddings | Same model for resume + jobs (must match dimensions) |
| `IndexFlatL2` FAISS | Keep for MVP; upgrade to `IndexIVFFlat` if dataset > 50k |
| `job_metadata.pkl` | Replace with Postgres `jobs` table; FAISS index maps by row id |
| Distance → score normalization | Keep; expose as `match_score` 0–100 |

**Fixes needed:**
- Remove hardcoded `GEMINI_API_KEY`; use env vars only
- Pre-build index offline (`scripts/build_job_index.py`); API loads index at startup
- Resume embedding: build text from parsed JSON using same field names as parser schema

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  Auth (Supabase) │ Upload │ Jobs │ Suggestions │ Chat     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + JWT
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                            │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐   │
│  │ Guardrails  │ │ Auth Middleware│ │ Rate Limiter       │   │
│  └──────┬──────┘ └──────────────┘ └─────────────────────┘   │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │ Modules: parser │ job_search │ cv_suggest │ mentor  │    │
│  └──────┬───────────────┬──────────────┬─────────┬──────┘    │
│         │               │              │         │          │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼────┐ ┌──▼──────┐  │
│  │ Gemini LLM  │ │ Gemini Embed│ │  FAISS   │ │ LangChain│  │
│  └─────────────┘ └─────────────┘ │ (jobs +  │ │ RAG pipe │  │
│                                   │  notes)  │ └──────────┘  │
└───────────────────────────────────┴──────────┴───────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Supabase (Auth + PostgreSQL)                    │
│  users │ resumes │ jobs │ searches │ suggestions │ chats    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API Endpoints (FastAPI)

### Auth (delegated to Supabase; backend validates JWT)
- Frontend uses `@supabase/supabase-js` for sign-up/login
- Backend: `get_current_user()` via Supabase JWT secret

### Resume
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/resumes/upload` | Upload PDF/DOCX → parse → save profile |
| GET | `/api/resumes/{id}` | Get parsed profile |
| GET | `/api/resumes` | List user's resumes |

### Job Search
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/jobs/match` | Embed profile → FAISS top-N |
| GET | `/api/jobs/{job_id}` | Job detail from Postgres |
| GET | `/api/jobs` | Paginated browse + filters |

### CV Suggestions (Module 3)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/suggestions/generate` | Resume + target job → suggestions JSON |
| GET | `/api/suggestions/{id}` | Past suggestion run |

### Mentor (Module 4)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/mentor/chat` | RAG chat (streaming SSE) |
| GET | `/api/mentor/sessions` | List chat sessions |
| GET | `/api/mentor/sessions/{id}/messages` | Session history |

### Admin (optional MVP+)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/reindex-jobs` | Rebuild FAISS from dataset |
| POST | `/api/admin/career-notes` | Upload career docs |

---

## 4. Database Schema (PostgreSQL / Supabase)

```sql
-- profiles (extends auth.users)
profiles (id UUID PK → auth.users, full_name, created_at)

-- resumes
resumes (id, user_id, file_path, raw_text_hash, parsed_json JSONB, created_at)

-- jobs (from your CSV)
jobs (id, job_id, title, experience_level, years_of_experience,
      skills, responsibilities, keywords, search_text, faiss_index INT)

-- job_matches (search history)
job_matches (id, user_id, resume_id, results JSONB, created_at)

-- cv_suggestions
cv_suggestions (id, user_id, resume_id, job_id, suggestions JSONB, created_at)

-- mentor
chat_sessions (id, user_id, title, created_at)
chat_messages (id, session_id, role, content, citations JSONB, created_at)

-- career_notes (for RAG)
career_notes (id, title, content, source_path, chunk_index)
```

RLS: all tables scoped by `user_id = auth.uid()` except `jobs` and `career_notes` (read-only public).

---

## 5. Remaining Modules — Implementation Plan

### Module 3 — CV Improvement Generator
- **Input:** parsed resume JSON + selected job (id or pasted description)
- **Output:** `{ missing_skills, bullet_improvements[], summary_rewrite, ats_tips[] }`
- **Prompt library:** `backend/app/prompts/cv_suggestions.py`
- **Cache:** store in `cv_suggestions` table to avoid repeat LLM calls

### Module 4 — AI Career Mentor (RAG)
- **Corpus:** job descriptions (chunked) + `data/career_notes/` markdown guides
- **Pipeline:** LangChain `RetrievalQA` or custom: embed query → FAISS (notes index) + optional job retriever → context → Gemini
- **Citations:** return `source_id`, `snippet`, `title` per chunk
- **Memory:** session messages in Postgres; last N turns in prompt

### Module 5 — Guardrails
- **Pre-LLM:** keyword + lightweight classifier prompt ("is this career-related?")
- **Post-LLM:** check grounding — if no retrieval hits above threshold, force "I don't have enough information"
- **Blocked topics:** regex + LLM safety filter before every mentor/suggestion call
- **Applied at:** FastAPI middleware + per-module decorator

### Module 6 — React Frontend
| Page | Features |
|------|----------|
| `/login`, `/signup` | Supabase Auth |
| `/dashboard` | Recent resumes, quick actions |
| `/resume/upload` | Drag-drop, parse progress, profile view |
| `/jobs` | Match results, filters, job detail drawer |
| `/suggestions` | Pick job → generate → display sections |
| `/mentor` | Chat UI with citations, session sidebar |

---

## 6. Build Phases

### Phase 1 — Foundation (Week 1)
1. Folder structure + env setup
2. FastAPI skeleton + Supabase JWT auth
3. Integrate resume parser (Module 1) as API
4. Import job CSV → Postgres + build FAISS script
5. Job match API (Module 2)
6. React auth + upload + profile + job results pages

### Phase 2 — AI Features (Week 2)
7. CV suggestion generator + API + UI
8. Career notes ingestion + FAISS index
9. RAG mentor pipeline + streaming chat API
10. Chat UI with citations

### Phase 3 — Polish & Deploy (Week 3)
11. Guardrails on all LLM endpoints
12. Evaluation script + report template
13. Docker / Render / Railway backend deploy
14. Vercel or Netlify frontend deploy
15. README + demo video

---

## 7. Data Folder (you provide)

Place your files here:

```
data/
├── raw/
│   └── jobs_cleaned.csv      ← your processed dataset
├── indexes/
│   ├── job_faiss.index       ← built by scripts/build_job_index.py
│   ├── job_metadata.pkl      ← optional; prefer Postgres
│   └── career_notes_faiss.index
├── career_notes/             ← markdown/PDF guides for mentor RAG
└── sample_resumes/           ← test PDFs
```

---

## 8. Evaluation Deliverables

| Metric | How we measure |
|--------|----------------|
| Retrieval relevance | 10 sample profiles → manual yes/no on top-5 jobs |
| Answer quality | 15 mentor questions → rubric (correctness, grounding, helpfulness) |
| Prompt comparison | Before/after prompt in `docs/evaluation/prompt_comparison.md` |
| Hallucination | Questions with no doc coverage → must refuse |

Script: `scripts/run_evaluation.py`
