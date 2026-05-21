# FocusIQ AI Service (Phase 0)

## Prerequisites

- Python 3.11+

## Setup

```bash
cd ai-service
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements-dev.txt
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Quality Commands

```bash
ruff check app
black --check app
pytest
```

## Available Endpoints (Phase 0)

- `GET /health`
- `POST /predict`
- `POST /emotion/predict`
- `POST /focus/predict`
- `POST /readiness/score`
- `POST /reports/generate`

These are scaffolded endpoints and will be expanded in later phases.
