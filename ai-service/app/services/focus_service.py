from app.schemas.focus_schema import FocusPredictResponse, InferenceSignals


def compute_focus_score(signals: InferenceSignals) -> FocusPredictResponse:
    score = 88

    if signals.lookingAway:
        score -= 18
    if signals.yawning:
        score -= 14
    if signals.slouching:
        score -= 12
    if signals.phoneDetected:
        score -= 20

    score -= signals.alertLevel * 4

    if signals.calibrationSeconds < 15:
        score += 4

    bounded = max(0, min(score, 100))
    return FocusPredictResponse(score=int(bounded))
