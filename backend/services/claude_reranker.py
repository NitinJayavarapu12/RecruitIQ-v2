import re
import json
import hashlib
import asyncio
import os
import warnings
from typing import List, Dict, Tuple, Optional

from dotenv import load_dotenv
load_dotenv(override=True)

import anthropic

warnings.filterwarnings("ignore")

# ── Anthropic client ──────────────────────────────────────────────────────────

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── In-memory LlamaParse cache (persists for server lifetime) ─────────────────
# Key: MD5 hash of first 8KB of file content → Value: extracted text
_llama_cache: Dict[str, str] = {}


# ── LlamaParse text extraction ────────────────────────────────────────────────

def parse_pdf_with_llama(file_path: str) -> Optional[str]:
    """Use LlamaParse to extract clean structured text from a PDF.
    Results are cached in memory by file content hash for the server lifetime.
    """
    filename = os.path.basename(file_path)

    # Compute MD5 of first 8KB
    try:
        with open(file_path, "rb") as f:
            file_hash = hashlib.md5(f.read(8192)).hexdigest()
    except Exception:
        file_hash = None

    # Check in-memory cache
    if file_hash and file_hash in _llama_cache:
        print(f"  [CACHE] {filename}")
        return _llama_cache[file_hash]

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

        if file_hash:
            _llama_cache[file_hash] = text
        print(f"  [LLAMA] {filename}")
        return text
    except Exception as e:
        print(f"  [LLAMA] Parse failed: {e}")
        return None


# ── Stop words for keyword extraction ────────────────────────────────────────

STOP = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "be", "have", "has", "do",
    "will", "can", "this", "that", "we", "you", "they", "it", "as", "if",
    "not", "more", "also", "work", "experience", "required", "preferred",
    "strong", "knowledge", "use", "using", "ability", "skills", "good",
    "must", "any", "all", "both", "into", "through", "than", "then",
    "our", "your", "their", "should", "would", "could", "may", "might",
    # Extended stop words
    "team", "skill", "develop", "other", "members", "organization",
    "description", "methodologies", "time", "company", "project", "process",
    "system", "manage", "support", "provide", "ensure", "include", "various",
    "different", "new", "well", "high", "key", "large", "within", "between",
    "following", "related", "based", "used", "per", "etc", "responsible",
    "working", "including", "multiple", "communication", "analytical",
    "management", "software",
    "years", "client", "developer", "pvt", "ltd", "india",
    "across", "enhance", "facilitate", "module", "quality", "cost",
    "lead", "deep", "benefits", "fast", "growing", "teams", "manager",
    "administration", "eclipse", "programming", "sql", "linux",
    "windows", "manufacturing", "tools", "tool",
    "job", "like", "while", "about", "stakeholders", "education",
    "collaborating", "skilled", "executed", "problem-solving",
    "lifecycle", "technologies", "deployment", "language", "model",
    "expertise", "shell", "core", "architecture", "medical",
    "migration", "access", "apply", "database", "oracle", "workflow",
}


# ── Keyword-based skills extraction (fallback) ────────────────────────────────

def extract_skills(text: str, jd_text: str) -> Tuple[List[str], List[str]]:
    text_lower = text.lower()
    jd_lower = jd_text.lower()

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


# ── Comprehensive Claude prompt ───────────────────────────────────────────────

COMPREHENSIVE_PROMPT = """\
You are an expert technical recruiter evaluating a candidate resume against a job description.

JD REQUIREMENTS:
- Role: {required_title}
- Min Experience: {required_years} years
- Education: {required_education}
- Domain: {required_domain}
- Primary Skills Required: {primary_skills}
- Secondary Skills Preferred: {secondary_skills}

RESUME TEXT:
{resume_text}

Extract ALL fields and score the candidate. Return ONLY a valid JSON object with exactly these keys:

{{
  "name": "candidate full name",
  "email": "email address",
  "phone": "phone number",
  "linkedin": "LinkedIn profile URL",
  "years_of_experience": "total years as a number string (e.g. '6')",
  "current_company": "most recent or current employer",
  "education": "degree + branch (e.g. 'B.E Mechanical Engineering')",
  "education_meets_jd": true,
  "matched_skills": ["skills candidate has that JD requires"],
  "missing_skills": ["JD required skills the candidate is missing"],
  "candidate_summary": "one line summary: X years [role] at [company], strengths, gaps",
  "technical_skills_score": 75,
  "technical_skills_reason": "brief reason for score",
  "experience_score": 70,
  "experience_reason": "brief reason for score",
  "domain_score": 80,
  "domain_reason": "brief reason for score",
  "role_score": 65,
  "role_reason": "brief reason for score",
  "education_score": 85,
  "education_reason": "brief reason for score",
  "career_score": 70,
  "career_reason": "brief reason for score"
}}

Scoring rules (0-100 each):
- technical_skills_score: Does candidate have the required technical tools at adequate depth?
- experience_score: Years of relevant experience vs JD requirement + quality/relevance of work.
- domain_score: Industry domain match (automotive, aerospace, healthcare, manufacturing etc).
- role_score: Do the candidate's responsibilities match what the JD needs day-to-day?
- education_score: Degree relevance, field of study match, certifications bonus.
- career_score: Job stability, career progression, tenure quality.

Other rules:
- name: Full name only. No titles. Use "N/A" if not found.
- email: Valid email or "N/A".
- phone: With country code if present, or "N/A".
- linkedin: Full URL starting https://www.linkedin.com/in/ or "N/A".
- years_of_experience: Total professional years as string number (e.g. "6"). Use "0" if unknown.
- education: Extract the highest degree and field of study from the resume (e.g. "B.E Mechanical Engineering", "M.Tech Computer Science", "B.Tech Electronics"). Look in sections titled Education, Academic Background, Qualifications. Do NOT return "N/A" unless truly absent — look carefully through the entire resume text.
- education_meets_jd: true if education meets or exceeds the JD requirement, false otherwise.
- matched_skills: only skills from the JD's primary+secondary list that candidate actually has.
- missing_skills: only skills from JD's primary list that candidate is clearly missing.
- All score values must be integers 0-100.
- Return ONLY the JSON object. No explanation, no markdown, no extra text.
"""


def extract_and_score_with_claude(text: str, jd_requirements: dict) -> dict:
    """
    Single Claude Haiku call: extract all fields AND score the candidate.
    Returns a dict with all extraction + scoring fields.
    """
    primary_str = ", ".join(jd_requirements.get("primary_skills", []))
    secondary_str = ", ".join(jd_requirements.get("secondary_skills", []))

    prompt = COMPREHENSIVE_PROMPT.format(
        required_title=jd_requirements.get("required_title", "N/A"),
        required_years=jd_requirements.get("required_years", "0"),
        required_education=jd_requirements.get("required_education", "N/A"),
        required_domain=jd_requirements.get("required_domain", "N/A"),
        primary_skills=primary_str or "N/A",
        secondary_skills=secondary_str or "N/A",
        resume_text=text,
    )

    defaults = {
        "name": "N/A", "email": "N/A", "phone": "N/A", "linkedin": "N/A",
        "years_of_experience": "0", "current_company": "N/A",
        "education": "N/A", "education_meets_jd": False,
        "matched_skills": [], "missing_skills": [],
        "candidate_summary": "N/A",
        "technical_skills_score": 0, "technical_skills_reason": "N/A",
        "experience_score": 0, "experience_reason": "N/A",
        "domain_score": 0, "domain_reason": "N/A",
        "role_score": 0, "role_reason": "N/A",
        "education_score": 0, "education_reason": "N/A",
        "career_score": 0, "career_reason": "N/A",
    }

    try:
        response = _client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1200,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        data = json.loads(raw)

        def safe_str(key):
            v = data.get(key, defaults[key])
            return str(v) if v is not None else "N/A"

        def safe_int(key):
            try:
                return max(0, min(100, int(data.get(key, 0) or 0)))
            except (ValueError, TypeError):
                return 0

        def safe_list(key):
            v = data.get(key, [])
            return list(v) if isinstance(v, list) else []

        return {
            "name":                    safe_str("name") or "N/A",
            "email":                   safe_str("email") or "N/A",
            "phone":                   safe_str("phone") or "N/A",
            "linkedin":                safe_str("linkedin") or "N/A",
            "years_of_experience":     safe_str("years_of_experience") or "0",
            "current_company":         safe_str("current_company") or "N/A",
            "education":               safe_str("education") or "N/A",
            "education_meets_jd":      bool(data.get("education_meets_jd", False)),
            "matched_skills":          safe_list("matched_skills"),
            "missing_skills":          safe_list("missing_skills"),
            "candidate_summary":       safe_str("candidate_summary") or "N/A",
            "technical_skills_score":  safe_int("technical_skills_score"),
            "technical_skills_reason": safe_str("technical_skills_reason") or "N/A",
            "experience_score":        safe_int("experience_score"),
            "experience_reason":       safe_str("experience_reason") or "N/A",
            "domain_score":            safe_int("domain_score"),
            "domain_reason":           safe_str("domain_reason") or "N/A",
            "role_score":              safe_int("role_score"),
            "role_reason":             safe_str("role_reason") or "N/A",
            "education_score":         safe_int("education_score"),
            "education_reason":        safe_str("education_reason") or "N/A",
            "career_score":            safe_int("career_score"),
            "career_reason":           safe_str("career_reason") or "N/A",
        }

    except Exception as e:
        print(f"  [CLAUDE] Extraction+scoring failed: {e}")
        return defaults


def compute_final_score(fields: dict) -> float:
    """Compute weighted final score from 6 dimension scores."""
    return (
        fields["technical_skills_score"] * 0.30 +
        fields["experience_score"]        * 0.25 +
        fields["domain_score"]            * 0.20 +
        fields["role_score"]              * 0.10 +
        fields["education_score"]         * 0.10 +
        fields["career_score"]            * 0.05
    )


def get_tier(final_score: float) -> str:
    if final_score >= 90:
        return "🌟 Excellent Match"
    elif final_score >= 75:
        return "✅ Strong Match"
    elif final_score >= 60:
        return "⚠️ Good Match"
    elif final_score >= 45:
        return "🔶 Partial Match"
    else:
        return "❌ Weak Match"


def get_experience_flag(years_str: str, required_years_str: str) -> str:
    try:
        years = int(float(years_str or "0"))
        required = int(float(required_years_str or "0"))
    except (ValueError, TypeError):
        return "⚠️"

    if years >= required:
        return "✅"
    elif years >= required - 1:
        return "⚠️"
    else:
        return "❌"


# ── Main resume processor ─────────────────────────────────────────────────────

def process_single_resume(resume: Dict, jd_text: str, jd_requirements: dict) -> Dict:
    filename = resume.get("filename", "")
    file_path = resume.get("path", "")
    ocr_text = resume.get("text", "")
    keyword_score = resume.get("keyword_score", 0)

    clean_text = parse_pdf_with_llama(file_path)
    text = clean_text if clean_text else ocr_text
    source = "LlamaParse" if clean_text else "OCR"

    # Single comprehensive Claude call
    fields = extract_and_score_with_claude(text, jd_requirements)

    final_score = round(compute_final_score(fields), 1)
    tier = get_tier(final_score)
    experience_flag = get_experience_flag(
        fields["years_of_experience"],
        jd_requirements.get("required_years", "0")
    )

    print(
        f"  [{source}] name={fields['name']} | "
        f"score={final_score} | tier={tier}"
    )

    return {
        "filename":                filename,
        "name":                    fields["name"],
        "phone":                   fields["phone"],
        "email":                   fields["email"],
        "linkedin":                fields["linkedin"],
        "years_of_experience":     fields["years_of_experience"],
        "experience_flag":         experience_flag,
        "current_company":         fields["current_company"],
        "latest_employment":       fields["current_company"],   # backward compat
        "education":               fields["education"],
        "education_meets_jd":      fields["education_meets_jd"],
        "matched_skills":          fields["matched_skills"],
        "missing_skills":          fields["missing_skills"],
        "candidate_summary":       fields["candidate_summary"],
        "technical_skills_score":  fields["technical_skills_score"],
        "technical_skills_reason": fields["technical_skills_reason"],
        "experience_score":        fields["experience_score"],
        "experience_reason":       fields["experience_reason"],
        "domain_score":            fields["domain_score"],
        "domain_reason":           fields["domain_reason"],
        "role_score":              fields["role_score"],
        "role_reason":             fields["role_reason"],
        "education_score":         fields["education_score"],
        "education_reason":        fields["education_reason"],
        "career_score":            fields["career_score"],
        "career_reason":           fields["career_reason"],
        "final_score":             final_score,
        "score":                   final_score,   # backward compat
        "tier":                    tier,
        "keyword_score":           keyword_score,
    }


# ── Deduplication ─────────────────────────────────────────────────────────────

def deduplicate_results(results: List[Dict], top_n: int = 50) -> List[Dict]:
    """
    Remove duplicate candidates then return top N sorted by final_score.
    Deduplicates by email first, then by name.
    """
    results.sort(key=lambda x: x.get("final_score", x.get("score", 0)), reverse=True)

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

CONCURRENCY_LIMIT = 5  # max simultaneous LlamaParse + Claude calls


CONCURRENCY_LIMIT = 5  # max simultaneous LlamaParse + Claude calls


async def claude_rerank(
    jd_text: str,
    resumes: List[Dict],
    top_n: int = 50,
    jd_requirements: dict = None,
    on_progress=None,
) -> List[Dict]:
    """
    Process resumes using LlamaParse + comprehensive Claude scoring.
    Runs up to CONCURRENCY_LIMIT resumes in parallel to reduce wall-clock time.
    on_progress(done, total, filename): optional callback called after each resume finishes.
    """
    if jd_requirements is None:
        jd_requirements = {}

    loop = asyncio.get_event_loop()
    total = len(resumes)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    done_count = 0

    print(f"[LLAMAPARSE] Processing {total} resumes (concurrency={CONCURRENCY_LIMIT})...")

    async def process_with_semaphore(resume: Dict):
        nonlocal done_count
        async with semaphore:
            result = await loop.run_in_executor(
                None, process_single_resume, resume, jd_text, jd_requirements
            )
            done_count += 1
            print(f"[LLAMAPARSE] {done_count}/{total}: {resume['filename']}")
            if on_progress:
                on_progress(done_count, total, resume["filename"])
            return result

    tasks = [process_with_semaphore(r) for r in resumes]
    all_results = await asyncio.gather(*tasks)

    final_results = deduplicate_results(list(all_results), top_n=top_n)
    valid = [r for r in final_results if r.get("name") not in ("N/A", None, "")]
    print(f"[LLAMAPARSE] Done — {len(final_results)} unique candidates, {len(valid)} with names extracted")
    return final_results
