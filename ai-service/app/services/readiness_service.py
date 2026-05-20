from app.schemas.focus_schema import InferenceSignals
from app.schemas.readiness_schema import ReadinessScoreResponse


def compute_readiness_score(signals: InferenceSignals) -> ReadinessScoreResponse:
    score = 75

    if signals.lookingAway:
        score -= 20
    if signals.yawning:
        score -= 18
    if signals.slouching:
        score -= 16
    if signals.phoneDetected:
        score -= 22

    score -= signals.alertLevel * 6

    if signals.elapsedSeconds > 1800:
        score -= 8

    bounded = max(0, min(score, 100))
    return ReadinessScoreResponse(score=int(bounded))
