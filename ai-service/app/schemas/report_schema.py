from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    schemaVersion: str = "v1"
    modelVersion: str = "reports-heuristic-v1"
    session_id: str
    topic_name: str = ""
    duration_minutes: int = 0
    avg_focus_percent: int = 0
    readiness_score: int = 0
    notes: str = ""


class ReportGenerateResponse(BaseModel):
    schemaVersion: str = "v1"
    modelVersion: str = "reports-heuristic-v1"
    session_id: str
    status: str
    summary: str
    markdown: str
