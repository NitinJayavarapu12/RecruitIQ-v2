import asyncio
import json
import os
import re
import tempfile
import uuid
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

from services.jd_parser import parse_jd_from_bytes
from services.resume_parser import get_pdf_files, parse_single_resume
from services.keyword_matcher import keyword_match
from services.claude_reranker import claude_rerank
from services.file_manager import copy_filtered_resumes
from services.excel_exporter import export_to_excel

app = FastAPI(title="Resume Screener API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs: Dict[str, Any] = {}


# ── Helper ────────────────────────────────────────────────────────────────────

def init_job() -> Dict:
    return {
        "status": "pending",
        "phase": "Initializing...",
        "progress": 0,
        "total": 0,
        "current_file": "",
        "results": [],
        "excel_path": None,
        "filtered_folder": None,
        "error": None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/screen")
async def screen_resumes(
    background_tasks: BackgroundTasks,
    jd_file: UploadFile = File(...),
    resume_folder: str = Form(...),
    top_n: int = Form(...),
):
    job_id = str(uuid.uuid4())
    jobs[job_id] = init_job()

    # Read file bytes directly — no temp file
    file_bytes = await jd_file.read()
    filename = jd_file.filename

    # Parse JD immediately from bytes
    try:
        from services.jd_parser import parse_jd_from_bytes
        jd_text = parse_jd_from_bytes(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse JD: {str(e)}")

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="JD file appears to be empty or unreadable.")

    background_tasks.add_task(
        run_screening,
        job_id=job_id,
        jd_text=jd_text,
        jd_filename=filename,
        resume_folder=resume_folder.strip(),
        top_n=int(top_n),
    )

    return {"job_id": job_id}


@app.get("/api/progress/{job_id}")
async def stream_progress(job_id: str):
    """Server-Sent Events stream for live progress updates."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        while True:
            job = jobs.get(job_id)
            if not job:
                break

            payload = {k: v for k, v in job.items() if k != "excel_path"}
            yield f"data: {json.dumps(payload)}\n\n"

            if job["status"] in ("complete", "error"):
                break

            await asyncio.sleep(0.4)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/results/{job_id}")
async def get_results(job_id: str):
    """Get final results for a completed job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    return {
        "status": job["status"],
        "results": job["results"],
        "filtered_folder": job["filtered_folder"],
        "error": job["error"],
    }


@app.get("/api/download/{job_id}")
async def download_excel(job_id: str):
    """Download the generated Excel report."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    excel_path = jobs[job_id].get("excel_path")
    if not excel_path or not os.path.exists(excel_path):
        raise HTTPException(status_code=404, detail="Excel report not yet available")

    return FileResponse(
        excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(excel_path),
    )


# ── Filename-based deduplication ─────────────────────────────────────────────

def extract_candidate_key(filename: str) -> str:
    """Normalize a resume filename to a two-token candidate identity key.

    Examples:
      TusharZirmire_Resume.pdf   → 'tusharzirmire'
      Tushar_Zirmire_Updated.pdf → 'tusharzirmire'
      Tushar Zirmire CV.pdf      → 'tusharzirmire'
      TusharZirmire2024.pdf      → 'tusharzirmire'
    """
    name = os.path.splitext(filename)[0]
    parts = re.split(r'[_\-\s\.]+', name)
    tokens = []
    for part in parts:
        camel = re.sub(r'([a-z])([A-Z])', r'\1 \2', part).split()
        tokens.extend(camel if camel else [part])
    key_tokens = [t.lower() for t in tokens if len(t) >= 2][:2]
    return ''.join(key_tokens)


def deduplicate_by_candidate(scored: list) -> list:
    """Keep only the highest-scoring resume per candidate.

    Input must already be sorted by keyword_score descending —
    the first occurrence of each candidate key wins.
    """
    seen = {}
    for resume in scored:
        key = extract_candidate_key(resume["filename"])
        if key not in seen:
            seen[key] = resume
    return list(seen.values())


# ── Background task ───────────────────────────────────────────────────────────

async def run_screening(
    job_id: str,
    jd_text: str,
    jd_filename: str,
    resume_folder: str,
    top_n: int,
):
    try:
        job = jobs[job_id]

        # Step 1: JD already parsed — skip parsing step
        job["status"] = "running"
        job["phase"] = "Scanning resume folder..."

        # Step 2: Get list of PDF files
        from services.resume_parser import get_pdf_files, parse_single_resume
        pdf_files = get_pdf_files(resume_folder)
        total = len(pdf_files)
        job["total"] = total

        if total == 0:
            job["status"] = "error"
            job["error"] = "No PDF resumes found in the specified folder."
            return

        # Step 3: Parse + keyword match each resume one by one
        job["phase"] = "Phase 1: Reading and scoring resumes..."
        scored = []
        loop = asyncio.get_event_loop()

        for i, filename in enumerate(pdf_files):
            job["progress"] = i + 1
            job["current_file"] = filename

            file_path = os.path.join(resume_folder, filename)
            resume = await loop.run_in_executor(
                None, parse_single_resume, file_path, filename
            )

            if resume:
                resume["keyword_score"] = keyword_match(jd_text, resume["text"])
                scored.append(resume)

            await asyncio.sleep(0)

        # Step 4: Pick top N by keyword score, one resume per candidate
        # Send top_n + 10 to LlamaParse as a buffer so post-dedup losses
        # (by email/name) don't reduce the final count below top_n.
        scored.sort(key=lambda x: x["keyword_score"], reverse=True)
        scored = deduplicate_by_candidate(scored)
        top_resumes = scored[:top_n + 10]

        if not top_resumes:
            job["status"] = "complete"
            job["phase"] = "Done — no resumes could be parsed."
            job["results"] = []
            return

        # Step 5: Groq extracts structured info from top N
        job["phase"] = f"Phase 2: Extracting details from top {len(top_resumes)} resumes..."
        results = await claude_rerank(jd_text, top_resumes, top_n=top_n)

        # Step 6: Copy filtered resumes to subfolder
        job["phase"] = "Saving top resumes..."
        filtered_folder = copy_filtered_resumes(
            resume_folder, [r["filename"] for r in results]
        )
        job["filtered_folder"] = filtered_folder

        # Step 7: Generate Excel
        job["phase"] = "Generating Excel report..."
        excel_path = export_to_excel(results, jd_filename)

        job["results"] = results
        job["excel_path"] = excel_path
        job["status"] = "complete"
        job["phase"] = f"Done! Top {len(results)} candidates found."

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["phase"] = "Error occurred."