from fastapi import APIRouter

from app.schemas.planner_schema import GeneratePlannerRequest, GeneratePlannerResponse
from app.services.planner_service import generate_weekly_plan

router = APIRouter()


@router.post("/planner/generate", response_model=GeneratePlannerResponse)
def planner_generate(payload: GeneratePlannerRequest) -> GeneratePlannerResponse:
    return generate_weekly_plan(payload)
