from pydantic import BaseModel, Field


class InferenceSignals(BaseModel):
    lookingAway: bool = False
    yawning: bool = False
    slouching: bool = False
    phoneDetected: bool = False
    elapsedSeconds: int = Field(default=0, ge=0)
    alertLevel: int = Field(default=0, ge=0, le=3)
    calibrationSeconds: int = Field(default=0, ge=0, le=30)


class FocusPredictRequest(BaseModel):
    schemaVersion: str = Field(default="v1")
    modelVersion: str = Field(default="heuristic-v1")
    signals: InferenceSignals


class FocusPredictResponse(BaseModel):
    score: int
    schemaVersion: str = "v1"
    modelVersion: str = "heuristic-v1"
