from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class CandidateResult(BaseModel):
    filename: str
    name: str
    primary_skills: List[str]
    most_recent_company: str
    score: float
    tier: str
    reasoning: str


class JobStatus(BaseModel):
    status: str
    progress: int
    total: int
    current_file: str
    phase: str
    results: List[Dict[str, Any]]
    excel_path: Optional[str]
    error: Optional[str]
    filtered_folder: Optional[str]