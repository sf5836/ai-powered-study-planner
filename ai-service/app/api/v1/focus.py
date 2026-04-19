from fastapi import APIRouter

from app.schemas.focus_schema import FocusPredictRequest, FocusPredictResponse
from app.services.focus_service import compute_focus_score

router = APIRouter()


@router.post("/focus/predict", response_model=FocusPredictResponse)
def focus_predict(payload: FocusPredictRequest) -> FocusPredictResponse:
    return compute_focus_score(payload.signals)
