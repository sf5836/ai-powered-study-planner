from fastapi import FastAPI
from app.api.v1.emotion import router as emotion_router
from app.api.v1.focus import router as focus_router
from app.api.v1.health import router as health_router
from app.api.v1.planner import router as planner_router
from app.api.v1.readiness import router as readiness_router
from app.api.v1.reports import router as reports_router
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(title=settings.app_name)

app.include_router(health_router)
app.include_router(planner_router)
app.include_router(emotion_router)
app.include_router(focus_router)
app.include_router(readiness_router)
app.include_router(reports_router)
