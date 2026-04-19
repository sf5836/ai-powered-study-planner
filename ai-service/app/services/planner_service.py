from app.schemas.planner_schema import (
    GeneratePlannerRequest,
    GeneratePlannerResponse,
    PlannerSuggestion,
    PlannerTopicInput,
)


def _urgency_score(deadline_days: int) -> float:
    # 0 days -> 100 urgency, 14+ days -> lower urgency floor.
    return max(20.0, min(100.0, 100.0 - (deadline_days * 5.5)))


def _difficulty_score(difficulty: int) -> float:
    return float((difficulty / 5) * 100)


def _preparation_gap_score(preparation_percent: int) -> float:
    return float(100 - preparation_percent)


def _preference_score(preference: int) -> float:
    return float(preference)


def _priority(topic: PlannerTopicInput) -> float:
    # Priority = (Urgency * 0.40) + (Difficulty * 0.30) + (Preparation Gap * 0.20) + (Preference * 0.10)
    urgency = _urgency_score(topic.deadlineDays)
    difficulty = _difficulty_score(topic.difficulty)
    gap = _preparation_gap_score(topic.preparationPercent)
    preference = _preference_score(topic.preference)

    score = (urgency * 0.40) + (difficulty * 0.30) + (gap * 0.20) + (preference * 0.10)
    return round(max(0.0, min(100.0, score)), 2)


def generate_weekly_plan(payload: GeneratePlannerRequest) -> GeneratePlannerResponse:
    ranked = sorted(payload.topics, key=lambda topic: _priority(topic), reverse=True)

    suggestions: list[PlannerSuggestion] = []
    day_minutes_used = [0 for _ in range(7)]

    for index, topic in enumerate(ranked):
        priority = _priority(topic)
        base_duration = 45 if priority < 60 else 60 if priority < 80 else 90
        duration = min(base_duration, payload.availableMinutesPerDay)

        # Fill earliest day with available capacity.
        target_day = 0
        for day in range(7):
            if day_minutes_used[day] + duration <= payload.availableMinutesPerDay:
                target_day = day
                break
        else:
            target_day = index % 7

        day_minutes_used[target_day] += duration

        suggestions.append(
            PlannerSuggestion(
                topicId=topic.topicId,
                subjectId=topic.subjectId,
                topicName=topic.topicName,
                dayOffset=target_day,
                startHour=15 if day_minutes_used[target_day] <= duration else 17,
                durationMinutes=duration,
                priorityScore=priority,
                strategy="priority-focus-block",
            )
        )

    return GeneratePlannerResponse(suggestions=suggestions)
