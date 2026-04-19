from app.schemas.emotion_schema import EmotionPredictResponse
from app.schemas.focus_schema import InferenceSignals


def predict_emotion(signals: InferenceSignals) -> EmotionPredictResponse:
    distractions = sum(
        [
            1 if signals.lookingAway else 0,
            1 if signals.yawning else 0,
            1 if signals.slouching else 0,
            1 if signals.phoneDetected else 0,
        ]
    )

    label = "neutral"
    confidence = 0.72

    if signals.phoneDetected:
        label = "bored"
        confidence = 0.84
    elif signals.yawning and signals.slouching:
        label = "tired"
        confidence = 0.82
    elif distractions >= 2:
        label = "confused"
        confidence = 0.78
    elif distractions == 0 and signals.alertLevel == 0:
        label = "happy"
        confidence = 0.76

    return EmotionPredictResponse(label=label, confidence=confidence)
