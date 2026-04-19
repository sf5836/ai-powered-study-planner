from fastapi import APIRouter

from app.schemas.emotion_schema import EmotionPredictRequest, EmotionPredictResponse
from app.services.emotion_service import predict_emotion

router = APIRouter()


@router.post("/emotion/predict", response_model=EmotionPredictResponse)
def emotion_predict(payload: EmotionPredictRequest) -> EmotionPredictResponse:
    return predict_emotion(payload.signals)
