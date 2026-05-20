from app.schemas.focus_schema import FocusPredictResponse, InferenceSignals


def compute_focus_score(signals: InferenceSignals) -> FocusPredictResponse:
    score = 72

    if signals.lookingAway:
        score -= 42
    if signals.yawning:
        score -= 20
    if signals.slouching:
        score -= 18
    if signals.phoneDetected:
        score -= 25

    score -= signals.alertLevel * 6

    bounded = max(0, min(score, 100))
    return FocusPredictResponse(score=int(bounded))
