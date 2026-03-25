# RecruitIQ v2 — AI-Powered Resume Screening Agent

**Live Demo:** https://recruitiq-v2-1.onrender.com

RecruitIQ v2 is an advanced AI-powered resume screening tool that automatically analyzes job descriptions, extracts requirements, and ranks candidates using Claude AI. Built for recruiters and hiring managers who need to screen large volumes of resumes quickly and accurately.

---

## Features

- **AI JD Analysis** — Automatically extracts role, experience requirements, domain, and skills from any JD
- **Editable Skills Review** — Review and edit extracted skills before screening starts
- **Two-Phase Screening** — Fast keyword pre-filter followed by deep Claude AI scoring
- **6-Dimension Scoring** — Technical skills, experience, domain, role match, education, and career growth
- **Live Progress Tracking** — Real-time progress stream showing each resume as it is processed
- **Parallel Processing** — 5 concurrent Claude calls for fast throughput
- **Excel Report** — Color-coded 16-column report with scores, reasons, and candidate details
- **ZIP Download** — Download the top N matched resumes in one click
- **Supports PDF + DOCX** — Handles both file types with LlamaParse + pdfplumber + OCR fallback

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.13, Uvicorn |
| AI Scoring | Claude Haiku 4.5 (Anthropic) |
| PDF Parsing | LlamaParse, pdfplumber, Tesseract OCR |
| Excel Export | openpyxl |
| Fuzzy Matching | rapidfuzz |
| Deployment | Render (backend + frontend) |

---

## How It Works

### 4-Step Flow

**Step 1 — Upload & Configure**
Upload the JD file (PDF or DOCX), upload up to 400 resume files (PDF or DOCX), and set how many top candidates to return.

**Step 2 — JD Skills Review**
Claude extracts the job title, required years, domain, education, and primary/secondary skills from the JD. Review and edit the skills before screening begins. Click "Re-run AI" to refine if needed.

**Step 3 — Screening Progress**
Live progress bar shows each resume being processed across two phases:
- Phase 1: Keyword matching on all resumes
- Phase 2: Deep Claude AI scoring on the top candidates

**Step 4 — Results**
Ranked table of top candidates with scores, tiers, matched/missing skills, and download buttons.

---

## Scoring Model

Each resume is scored across 6 dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Technical Skills | 30% | Does the candidate have the required tools and depth? |
| Experience | 25% | Years of experience vs JD requirement + quality |
| Domain Knowledge | 20% | Industry domain match (automotive, aerospace, etc.) |
| Role Match | 10% | Do their responsibilities match the JD? |
| Education | 10% | Degree relevance + certifications |
| Career Growth | 5% | Job stability and career progression |

### Tier Classification

| Score | Tier |
|-------|------|
| 90–100 | 🌟 Excellent Match |
| 75–89 | ✅ Strong Match |
| 60–74 | ⚠️ Good Match |
| 45–59 | 🔶 Partial Match |
| 0–44 | ❌ Weak Match |

---

## Getting Started (Local)

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)
- [LlamaCloud API key](https://cloud.llamaindex.ai/)
- Tesseract OCR installed (`brew install tesseract` on macOS)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```
ANTHROPIC_API_KEY=sk-ant-...
LLAMA_CLOUD_API_KEY=llx-...
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze-jd` | Analyze JD file and extract requirements |
| POST | `/api/refine-skills` | Re-run Claude on JD with feedback |
| POST | `/api/screen` | Start screening job (background task) |
| GET | `/api/progress/{job_id}` | Server-Sent Events stream for live progress |
| GET | `/api/results/{job_id}` | Get final ranked results |
| GET | `/api/download/{job_id}` | Download Excel report |
| GET | `/api/download-zip/{job_id}` | Download ZIP of top N resumes |

---

## Deployment (Render)

### Backend — Web Service

- **Runtime:** Python 3
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `ANTHROPIC_API_KEY`
  - `LLAMA_CLOUD_API_KEY`
  - `ALLOWED_ORIGINS` = your frontend URL

### Frontend — Static Site

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL` = your backend URL

---

## Project Structure

```
RecruitIQ-v2/
├── backend/
│   ├── main.py                    # FastAPI app and endpoints
│   ├── requirements.txt
│   ├── runtime.txt
│   ├── models/
│   │   └── schemas.py
│   └── services/
│       ├── jd_analyzer.py         # JD extraction with Claude
│       ├── jd_parser.py           # JD file parsing
│       ├── resume_parser.py       # Resume parsing (LlamaParse + OCR fallback)
│       ├── claude_reranker.py     # AI scoring and ranking
│       ├── keyword_matcher.py     # Phase 1 keyword filter
│       ├── excel_exporter.py      # Excel report generation
│       └── file_manager.py        # ZIP creation
└── frontend/
    ├── src/
    │   ├── App.jsx                # 4-step flow
    │   ├── api/
    │   │   └── screenerAPI.js     # API client
    │   └── components/
    │       ├── JDUploader.jsx
    │       ├── ResumeUploader.jsx
    │       ├── ConfigInputs.jsx
    │       ├── JDReviewPanel.jsx
    │       ├── ProgressPanel.jsx
    │       └── ResultsPanel.jsx
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `LLAMA_CLOUD_API_KEY` | Yes | LlamaCloud API key for LlamaParse |
| `ALLOWED_ORIGINS` | Production | Comma-separated list of allowed frontend origins |
| `VITE_API_URL` | Production | Backend URL used by the frontend |

---

## Notes

- The free tier on Render spins down after inactivity — first request may take ~50 seconds
- LlamaParse results are cached in-memory per server session to avoid duplicate API calls
- All file processing uses temporary directories that are cleaned up after each job
- Maximum 400 resumes per screening run
