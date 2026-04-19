from app.schemas.focus_schema import InferenceSignals
from app.schemas.readiness_schema import ReadinessScoreResponse


def compute_readiness_score(signals: InferenceSignals) -> ReadinessScoreResponse:
    score = 80

    if signals.lookingAway:
        score -= 8
    if signals.yawning:
        score -= 12
    if signals.slouching:
        score -= 10
    if signals.phoneDetected:
        score -= 14

    score -= signals.alertLevel * 5

    if signals.elapsedSeconds > 1800:
        score -= 5

    bounded = max(0, min(score, 100))
    return ReadinessScoreResponse(score=int(bounded))
