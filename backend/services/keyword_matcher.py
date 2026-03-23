import re
from typing import List
from rapidfuzz import fuzz

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those",
    "we", "you", "they", "it", "he", "she", "our", "your", "their",
    "as", "if", "not", "than", "more", "also", "other", "new", "use",
    "work", "experience", "required", "preferred", "ability", "skills",
    "strong", "knowledge", "including", "such", "well", "must", "any",
    "all", "each", "both", "few", "more", "most", "other", "some",
    "such", "into", "through", "during", "before", "after", "above",
    "below", "between", "out", "off", "over", "under", "again", "further",
    "then", "once", "here", "there", "when", "where", "why", "how",
    "what", "which", "who", "whom", "its", "about", "per", "within",
}


def extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from text, filtering stop words."""
    text = text.lower()
    # Match words including tech-specific patterns like C++, .NET, Node.js
    words = re.findall(r'\b[a-z][a-z0-9+#./\-]*\b', text)
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    return list(set(keywords))


def keyword_match(jd_text: str, resume_text: str) -> float:
    """
    Score a resume against a JD using keyword overlap + fuzzy matching.
    Returns a score from 0 to 100.
    """
    jd_keywords = extract_keywords(jd_text)
    resume_lower = resume_text.lower()
    resume_words = set(re.findall(r'\b[a-z][a-z0-9+#./\-]*\b', resume_lower))

    if not jd_keywords:
        return 0.0

    matched = 0.0
    for keyword in jd_keywords:
        if keyword in resume_lower:
            # Direct match — full credit
            matched += 1.0
        else:
            # Fuzzy match for slight variations (e.g., "python" vs "pythonic")
            best_ratio = max(
                (fuzz.ratio(keyword, w) for w in resume_words if abs(len(w) - len(keyword)) <= 3),
                default=0,
            )
            if best_ratio >= 88:
                matched += 0.7

    score = (matched / len(jd_keywords)) * 100
    print(f"[SCORE] {score:.1f}% match")
    return min(round(score, 1), 100.0)