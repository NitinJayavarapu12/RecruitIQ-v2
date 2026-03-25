import json
import os
from typing import Dict

from dotenv import load_dotenv
load_dotenv(override=True)

import anthropic

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

JD_ANALYSIS_PROMPT = """\
You are an expert technical recruiter. Analyze the following Job Description and extract key requirements.

Return ONLY a valid JSON object with exactly these keys:

{{
  "required_title": "job title being hired for (e.g. Teamcenter Developer)",
  "required_years": "minimum years of experience as a number string (e.g. '5')",
  "required_education": "minimum degree qualification required (e.g. 'B.E/B.Tech Engineering', 'Graduate in any discipline'). Return the degree name only — do NOT return years of education or phrases like '15 years full time education'.",
  "required_domain": "industry domain (e.g. 'Automotive PLM', 'Aerospace', 'Healthcare IT')",
  "primary_skills": ["list", "of", "mandatory", "technical", "skills"],
  "secondary_skills": ["list", "of", "good-to-have", "skills"],
  "jd_summary": "one sentence summary of the role"
}}

Rules:
- required_years: extract only the number (e.g. "5" not "5+ years"). If a range, use the lower bound.
- primary_skills: list 5-10 mandatory technical tools, technologies, or skills explicitly required in the JD.
  Be specific (e.g. "Teamcenter", "BMIDE", "ITK", "Active Workspace") not generic (e.g. "software", "tools").
- secondary_skills: list 3-7 nice-to-have or preferred skills mentioned in the JD.
- All values must be strings or arrays of strings.
- Return ONLY the JSON object. No explanation, no markdown, no extra text.

Job Description:
{jd_text}
"""

REFINE_PROMPT = """\
You are an expert technical recruiter. Re-analyze this Job Description with the following feedback in mind: "{feedback}"

Focus on extracting more specific, granular technical skills — avoid generic terms.

Return ONLY a valid JSON object with exactly these keys:

{{
  "required_title": "job title being hired for",
  "required_years": "minimum years as a number string",
  "required_education": "minimum degree qualification required (e.g. 'B.E/B.Tech Engineering'). Degree name only — not years of education.",
  "required_domain": "industry domain",
  "primary_skills": ["list", "of", "mandatory", "technical", "skills"],
  "secondary_skills": ["list", "of", "good-to-have", "skills"],
  "jd_summary": "one sentence summary of the role"
}}

Rules:
- Be very specific with skill names (exact tool/technology names, not generic categories).
- Return ONLY the JSON object. No explanation, no markdown, no extra text.

Job Description:
{jd_text}
"""


def analyze_jd(jd_text: str, feedback: str = "") -> Dict:
    """
    Analyze a job description using Claude Haiku and extract structured requirements.
    Returns a dict with required_title, required_years, required_education,
    required_domain, primary_skills, secondary_skills, jd_summary.
    """
    if feedback:
        prompt = REFINE_PROMPT.format(jd_text=jd_text[:6000], feedback=feedback)
    else:
        prompt = JD_ANALYSIS_PROMPT.format(jd_text=jd_text[:6000])

    try:
        response = _client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=800,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        data = json.loads(raw)

        return {
            "required_title":     str(data.get("required_title", "N/A") or "N/A"),
            "required_years":     str(data.get("required_years", "0") or "0"),
            "required_education": str(data.get("required_education", "N/A") or "N/A"),
            "required_domain":    str(data.get("required_domain", "N/A") or "N/A"),
            "primary_skills":     list(data.get("primary_skills", []) or []),
            "secondary_skills":   list(data.get("secondary_skills", []) or []),
            "jd_summary":         str(data.get("jd_summary", "N/A") or "N/A"),
        }

    except Exception as e:
        print(f"  [JD_ANALYZER] Failed: {e}")
        return {
            "required_title":     "N/A",
            "required_years":     "0",
            "required_education": "N/A",
            "required_domain":    "N/A",
            "primary_skills":     [],
            "secondary_skills":   [],
            "jd_summary":         "N/A",
        }
