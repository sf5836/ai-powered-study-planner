from pydantic import BaseModel, Field
from app.schemas.focus_schema import InferenceSignals


class EmotionPredictRequest(BaseModel):
    schemaVersion: str = Field(default="v1")
    modelVersion: str = Field(default="heuristic-v1")
    signals: InferenceSignals


class EmotionPredictResponse(BaseModel):
    label: str
    confidence: float
    schemaVersion: str = "v1"
    modelVersion: str = "heuristic-v1"
