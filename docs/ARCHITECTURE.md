# SmartHire GenAI — System Architecture

SmartHire GenAI is a modern, end-to-end career portal providing intelligent resume parsing, semantic job matching, AI-powered CV suggestions and a custom career mentoring chatbot utilizing Retrieval-Augmented Generation (RAG). The application is built using a React (Vite/TypeScript) frontend, a FastAPI (Python) backend, a Supabase (PostgreSQL + Auth) database and the Google Gemini API.

---

## 1. System Topology

The overall system structure, request flows, and component dependencies are mapped as follows:

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

## 2. Core Modules & Subsystems

The application consists of five key GenAI and utility modules:

### Module 1: Resume Parser
- **Extraction Layer**: Extracts raw text from PDF and DOCX uploads using PyMuPDF (`fitz`) and `python-docx` tools.
- **Parsing Service**: Translates raw unstructured text into a schema-validated structure using Google Gemini (`gemini-2.5-flash`).
- **Validation**: Enforces fields using a structured Pydantic `Resume` schema. Performs post-parse data validation and unifies field names (e.g., matching education, skills, target role) before caching findings.
- **Persistence**: Serializes the validated schema to JSON and persists it under the PostgreSQL `resumes` table.

### Module 2: Semantic Job Search & Matching
- **Vector Embeddings**: Converts parsed user profiles and job descriptions into vector representations using the `gemini-embedding-001` model.
- **FAISS Search**: Performs semantic matching utilizing a local FAISS index (`IndexFlatL2`). 
- **Metadata Association**: Resolves index row identifiers back to metadata records stored in PostgreSQL.
- **Normalizer**: Transforms L2 distances into a user-facing `match_score` normalized on a `0–100` scale.

### Module 3: CV Improvement Generator
- **Context Injection**: Takes the parsed resume JSON model and maps it against a selected job profile (metadata or user-submitted job description).
- **Advisory LLM**: Submits tailored prompts to Gemini to generate actionable improvements, outputting a structured JSON response.
- **Response Format**: Generates fields covering missing skills, bullet-point revisions, ATS optimization advice, and an improved profile summary.
- **Database Cache**: Stores recommendations within the `cv_suggestions` table keyed by resume and job identifiers, avoiding redundant LLM computations and API tokens.

### Module 4: AI Career Mentor (RAG)
- **Knowledge Base**: Curates markdown and text guides stored in the `data/career_notes/` directory.
- **RAG Pipeline**: Implements a LangChain-based Retrieval-Augmented Generation pipeline. Vectorizes queries using `gemini-embedding-001`, searches the career notes index, and contextually prompts Gemini.
- **Memory Manager**: Pulls session history from PostgreSQL and appends the last 10 dialog turns inside the active contextual prompt.
- **SSE Streaming**: Pipes raw markdown content to the React frontend as a Server-Sent Events (SSE) stream, complete with source citations metadata.

### Module 5: Guardrails & Security
- **Input Guard**: Lightweight keyword and classifier prompts assessing query safety and relevance before forwarding to the LLM (verifying queries are career/professional development related).
- **Output Guard**: Grounds answers against retrieval source hits, forcing safe fallback statements ("I do not have enough information to answer that") when semantic confidence falls below set thresholds.
- **Auth Filter**: Protects API router endpoints using JWT validation middleware powered by Supabase Auth credentials.

---

## 3. Database Schema

The persistent database layer is designed as follows in PostgreSQL:

```sql
-- Profiles: Extends the central auth.users table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resumes: Stores parsed profile JSON and raw tracking details
CREATE TABLE resumes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_path VARCHAR(512),
    raw_text_hash VARCHAR(64),
    parsed_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jobs: Stores primary career dataset elements matching the FAISS index
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    experience_level VARCHAR(100),
    years_of_experience VARCHAR(50),
    skills TEXT,
    responsibilities TEXT,
    keywords TEXT,
    search_text TEXT,
    faiss_index INTEGER
);

-- CV Suggestions: Caches LLM-generated resume tailoring feedback
CREATE TABLE cv_suggestions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id VARCHAR(100) REFERENCES jobs(job_id) ON DELETE SET NULL,
    suggestions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Sessions: Logical groupings for AI Mentor dialogs
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages: Persistent dialog elements with citation arrays
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    citations JSONB, -- Array of source snippets/metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

*Note: Row Level Security (RLS) policies are active on user tables (`resumes`, `cv_suggestions`, `chat_sessions`, `chat_messages`), restricting data access to `user_id = auth.uid()` only.*

---

## 4. API Reference

All backend services are exposed under the `/api` prefix on the FastAPI application:

### Resumes
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/resumes/upload` | Upload PDF/DOCX → Parse → Save JSON & Return |
| `POST` | `/api/resumes/upload-and-match` | Upload PDF/DOCX → Parse → Compute FAISS Job Matches → Return |
| `POST` | `/api/resumes/match` | Perform semantic job search on an existing parsed resume |
| `GET`  | `/api/resumes` | Retrieve list of resumes uploaded by active user |
| `GET`  | `/api/resumes/{resume_id}` | Fetch specific parsed resume profile by ID |

### Jobs
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/jobs` | Paginated listing of jobs, supporting query keyword and experience level filters |
| `GET`  | `/api/jobs/{job_id}` | Retrieve specific job description metadata |
| `POST` | `/api/jobs/match` | Perform FAISS similarity matching for target resume profiles |
| `GET`  | `/api/jobs/health` | Verify if job vector index is properly loaded into memory |

### CV Suggestions
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/suggestions/generate` | Generate (or retrieve cached) CV improvements for a resume and job |
| `GET`  | `/api/suggestions/{suggestion_id}` | Fetch details of a specific generated suggestion |
| `GET`  | `/api/suggestions` | List past recommendations generated by active user |

### AI Career Mentor
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/mentor/chat` | Send message query → returns SSE stream of RAG chat response |
| `GET`  | `/api/mentor/sessions` | Retrieve list of chat sessions created by active user |
| `GET`  | `/api/mentor/sessions/{session_id}/messages` | Retrieve conversation history details for a specific session |

---

## 5. Storage & Layout

The project data and workspace folders are structured as follows:

```
rp2/
├── backend/                  # FastAPI Application Root
│   ├── app/
│   │   ├── api/              # Route controllers & API structure
│   │   ├── core/             # Configuration, Database engine, Auth security
│   │   ├── models/           # SQLAlchemy DB models
│   │   ├── modules/          # Core modules (parser, search, suggestions, mentor, guardrails)
│   │   ├── prompts/          # Standardized GenAI prompt templates
│   │   └── schemas/          # Pydantic schemas / DTOs
│   └── requirements.txt      # Backend Python dependencies
├── frontend/                 # React Application Root (Vite + TS)
│   ├── src/
│   │   ├── components/       # Reusable layout and custom UI widgets
│   │   ├── pages/            # View pages (Dashboard, Jobs, Suggestions, Mentor, Settings, Auth)
│   │   └── App.tsx           # Router mount and app initialization
├── data/                     # Vector stores & raw project assets
│   ├── career_notes/         # Markdown documents for Mentor RAG injection
│   ├── indexes/
│   │   ├── job_faiss.index   # FAISS job index bin
│   │   └── notes_faiss.index # FAISS career guides index bin
│   └── raw/
│       └── jobs_cleaned.csv  # Base dataset of jobs
└── scripts/                  # Administrative scripts (index builders, evaluation tools)
```

---

## 6. System Evaluation & Verification

To verify the quality and security of the generative search and mentoring modules, the system uses automated evaluation workflows:
- **Retrieval Relevance**: Profiles are mapped against the FAISS store, and matches are graded on matching skills and experience levels.
- **Answer Quality**: Mentor queries are tested against a predefined set of professional scenarios to check compliance with career advice guardrails.
- **Grounding Compliance**: Evaluation tests verify that RAG questions with no corresponding source coverage are handled safely, with the model refusing to hallucinate answers.

