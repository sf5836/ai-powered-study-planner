from pydantic import BaseModel, Field


class PlannerTopicInput(BaseModel):
    topicId: str
    subjectId: str
    topicName: str = Field(..., min_length=2)
    deadlineDays: int = Field(..., ge=0)
    difficulty: int = Field(..., ge=1, le=5)
    preparationPercent: int = Field(..., ge=0, le=100)
    preference: int = Field(default=50, ge=0, le=100)


class GeneratePlannerRequest(BaseModel):
    schemaVersion: str = "v1"
    modelVersion: str = "planner-heuristic-v1"
    weekStartDate: str
    availableMinutesPerDay: int = Field(default=120, ge=30, le=480)
    topics: list[PlannerTopicInput]


class PlannerSuggestion(BaseModel):
    topicId: str
    subjectId: str
    topicName: str
    dayOffset: int = Field(..., ge=0, le=6)
    startHour: int = Field(..., ge=6, le=23)
    durationMinutes: int = Field(..., ge=15, le=180)
    priorityScore: float = Field(..., ge=0, le=100)
    strategy: str


class GeneratePlannerResponse(BaseModel):
    schemaVersion: str = "v1"
    modelVersion: str = "planner-heuristic-v1"
    suggestions: list[PlannerSuggestion]
