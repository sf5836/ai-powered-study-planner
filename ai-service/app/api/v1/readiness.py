from fastapi import APIRouter
from app.schemas.readiness_schema import ReadinessScoreRequest, ReadinessScoreResponse
from app.services.readiness_service import compute_readiness_score

router = APIRouter()


@router.post("/readiness/score", response_model=ReadinessScoreResponse)
def readiness_score(payload: ReadinessScoreRequest) -> ReadinessScoreResponse:
    return compute_readiness_score(payload.signals)
