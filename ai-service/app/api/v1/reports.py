from fastapi import APIRouter

from app.schemas.report_schema import ReportGenerateRequest, ReportGenerateResponse
from app.services.report_service import generate_report_summary

router = APIRouter()


@router.post("/reports/generate", response_model=ReportGenerateResponse)
def reports_generate(payload: ReportGenerateRequest) -> ReportGenerateResponse:
    return generate_report_summary(
        payload.session_id,
        payload.topic_name,
        payload.duration_minutes,
        payload.avg_focus_percent,
        payload.readiness_score,
        payload.notes,
    )
