import re
import json
import hashlib
import asyncio
import os
import warnings
from typing import List, Dict, Tuple, Optional

import anthropic

warnings.filterwarnings("ignore")

# ── Anthropic client ──────────────────────────────────────────────────────────

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── LlamaParse text extraction ────────────────────────────────────────────────

def parse_pdf_with_llama(file_path: str) -> Optional[str]:
    """Use LlamaParse to extract clean structured text from a PDF, with MD5 caching."""
    # ── Cache setup ──────────────────────────────────────────────────────────
    resume_folder = os.path.dirname(file_path)
    filename = os.path.basename(file_path)
    cache_dir = os.path.join(resume_folder, ".llama_cache")
    cache_file = os.path.join(cache_dir, filename + ".json")

    # Compute MD5 of first 8KB to detect file changes
    try:
        with open(file_path, "rb") as f:
            file_hash = hashlib.md5(f.read(8192)).hexdigest()
    except Exception:
        file_hash = None

    # Check cache
    if file_hash and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if cached.get("hash") == file_hash and cached.get("text"):
                print(f"  [CACHE] {filename}")
                return cached["text"]
        except Exception:
            pass

    # ── Call LlamaParse API ──────────────────────────────────────────────────
    try:
        from llama_parse import LlamaParse
        parser = LlamaParse(
            api_key=os.environ.get("LLAMA_CLOUD_API_KEY"),
            result_type="markdown",
            verbose=False,
            show_progress=False,
        )
        docs = parser.load_data(file_path)
        if not (docs and docs[0].text.strip()):
            return None
        text = docs[0].text

        # Save to cache
        if file_hash:
            os.makedirs(cache_dir, exist_ok=True)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump({"hash": file_hash, "text": text}, f, ensure_ascii=False)
        print(f"  [LLAMA] {filename}")
        return text
    except Exception as e:
        print(f"  [LLAMA] Parse failed: {e}")
        return None


# ── Claude Haiku field extraction ─────────────────────────────────────────────

EXTRACT_PROMPT = """\
Extract the following fields from this resume text and return ONLY a valid JSON object with exactly these keys:

{{
  "name": "candidate full name",
  "email": "email address",
  "phone": "phone number",
  "linkedin": "LinkedIn profile URL",
  "latest_company": "most recent or current employer"
}}

Rules:
- name: Full name only (e.g. "Rahul Sharma"). No job titles, no prefixes like Mr/Dr.
- email: Valid email address (e.g. "rahul@gmail.com").
- phone: Include country code if present (e.g. "+91 9876543210" or "9876543210").
- linkedin: Full URL starting with https://www.linkedin.com/in/ (e.g. "https://www.linkedin.com/in/rahulsharma").
- latest_company: The company where the candidate currently works or most recently worked (e.g. "Tata Consultancy Services"). Do NOT include job title.
- Use "N/A" for any field you cannot find.
- Return ONLY the JSON object. No explanation, no markdown, no extra text.

Resume:
{text}
"""


def extract_fields_with_claude(text: str) -> dict:
    """
    Use Claude Haiku to extract name, email, phone, linkedin, latest_company
    from resume text. Falls back to N/A for any field on failure.
    """
    # Send first 4000 chars — contact info and latest job are almost always at the top
    snippet = text[:4000]
    prompt = EXTRACT_PROMPT.format(text=snippet)

    try:
        response = _client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        data = json.loads(raw)
        return {
            "name":           data.get("name", "N/A") or "N/A",
            "email":          data.get("email", "N/A") or "N/A",
            "phone":          data.get("phone", "N/A") or "N/A",
            "linkedin":       data.get("linkedin", "N/A") or "N/A",
            "latest_company": data.get("latest_company", "N/A") or "N/A",
        }
    except Exception as e:
        print(f"  [CLAUDE] Extraction failed: {e}")
        return {"name": "N/A", "email": "N/A", "phone": "N/A", "linkedin": "N/A", "latest_company": "N/A"}


# ── Skills matching ───────────────────────────────────────────────────────────

def extract_skills(text: str, jd_text: str) -> Tuple[List[str], List[str]]:
    text_lower = text.lower()
    jd_lower = jd_text.lower()

    STOP = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "is", "are", "was", "be", "have", "has", "do",
        "will", "can", "this", "that", "we", "you", "they", "it", "as", "if",
        "not", "more", "also", "work", "experience", "required", "preferred",
        "strong", "knowledge", "use", "using", "ability", "skills", "good",
        "must", "any", "all", "both", "into", "through", "than", "then",
        "our", "your", "their", "should", "would", "could", "may", "might",
        "team", "skill", "develop", "other", "members", "organization",
        "description", "methodologies", "time", "company", "project", "process",
        "system", "manage", "support", "provide", "ensure", "include", "various",
        "different", "new", "well", "high", "key", "large", "within", "between",
        "following", "related", "based", "used", "per", "etc", "responsible",
        "working", "including", "multiple", "communication", "analytical",
        "management", "software",
        "years", "client", "developer", "pvt", "ltd", "india", "rac",
        "across", "enhance", "facilitate", "module", "quality", "cost",
        "lead", "deep", "benefits", "fast", "growing", "teams", "manager",
        "administration", "eclipse", "programming", "sql", "linux",
        "windows", "manufacturing", "tools", "tool",
    }

    jd_keywords = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#./\-]{1,}\b', jd_lower))
    jd_keywords = {k for k in jd_keywords if k not in STOP and len(k) > 2}

    primary, secondary = [], []
    for keyword in jd_keywords:
        if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
            jd_count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', jd_lower))
            if jd_count >= 2:
                primary.append((keyword, jd_count))
            else:
                secondary.append(keyword)

    primary.sort(key=lambda x: x[1], reverse=True)
    return [k for k, _ in primary[:5]], secondary[:5]


# ── Main resume processor ─────────────────────────────────────────────────────

def process_single_resume(resume: Dict, jd_text: str) -> Dict:
    filename = resume.get("filename", "")
    file_path = resume.get("path", "")
    ocr_text = resume.get("text", "")
    score = resume.get("keyword_score", 0)

    clean_text = parse_pdf_with_llama(file_path)
    text = clean_text if clean_text else ocr_text
    source = "LlamaParse" if clean_text else "OCR"

    # Single Claude Haiku call replaces all regex extraction
    fields = extract_fields_with_claude(text)
    name           = fields["name"]
    email          = fields["email"]
    phone          = fields["phone"]
    linkedin       = fields["linkedin"]
    latest_company = fields["latest_company"]

    primary_skills, secondary_skills = extract_skills(text, jd_text)

    tier = "Strong Match" if score >= 80 else "Good Match" if score >= 60 else "Partial Match"

    print(f"  [{source}] name={name} | email={email} | company={latest_company}")

    return {
        "filename": filename,
        "name": name,
        "phone": phone,
        "email": email,
        "linkedin": linkedin,
        "primary_skills": primary_skills,
        "secondary_skills": secondary_skills,
        "latest_employment": latest_company,
        "score": score,
        "tier": tier,
        "reasoning": f"Matched {len(primary_skills)} primary and {len(secondary_skills)} secondary skills from JD.",
    }


# ── Deduplication ─────────────────────────────────────────────────────────────

def deduplicate_results(results: List[Dict], top_n: int = 50) -> List[Dict]:
    """
    Remove duplicate candidates then return top N sorted by score.
    Deduplicates by email first, then by name.
    Keeps the highest scoring version of each candidate.
    """
    results.sort(key=lambda x: x.get("score", 0), reverse=True)

    seen_emails = set()
    seen_names = set()
    unique = []

    for result in results:
        email = (result.get("email") or "").strip().lower()
        name  = (result.get("name") or "").strip().lower()

        email_key = email if email and email != "n/a" else None
        name_key  = name  if name  and name  != "n/a" else None

        if email_key and email_key in seen_emails:
            continue
        if name_key and name_key in seen_names:
            continue

        if email_key:
            seen_emails.add(email_key)
        if name_key:
            seen_names.add(name_key)

        unique.append(result)

    print(f"[DEDUP] {len(results)} resumes → {len(unique)} unique candidates")
    return unique[:top_n]


# ── Main entry point ──────────────────────────────────────────────────────────

async def claude_rerank(jd_text: str, resumes: List[Dict], top_n: int = 50) -> List[Dict]:
    """
    Process resumes using LlamaParse for PDF extraction + Claude Haiku for field extraction.
    Deduplicates candidates and returns top N sorted by matching score.
    """
    loop = asyncio.get_event_loop()
    all_results = []
    total = len(resumes)

    print(f"[LLAMAPARSE] Processing {total} resumes (~{total * 4 // 60} min estimated)...")

    for i, resume in enumerate(resumes):
        print(f"[LLAMAPARSE] {i + 1}/{total}: {resume['filename']}")
        result = await loop.run_in_executor(
            None, process_single_resume, resume, jd_text
        )
        all_results.append(result)

        if i < total - 1:
            await asyncio.sleep(1)

    final_results = deduplicate_results(all_results, top_n=top_n)

    valid = [r for r in final_results if r.get("name") not in ("N/A", None, "")]
    print(f"[LLAMAPARSE] Done — {len(final_results)} unique candidates, {len(valid)} with names extracted")
    return final_results
