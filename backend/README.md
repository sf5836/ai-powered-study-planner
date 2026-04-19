# FocusIQ Backend Local Setup

## Prerequisites

- Node.js 20+
- Local MongoDB running on `mongodb://localhost:27017`
- Optional: Redis on `localhost:6379`
- Optional: AI service on `http://localhost:8000`

## 1) Install dependencies

```bash
cd backend
npm install
```

## 2) Configure environment

Create `.env` in `backend/` using `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/studyplanner
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=focusiq-local-access-secret
JWT_REFRESH_SECRET=focusiq-local-refresh-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
```

## 3) Start backend

```bash
npm run dev
```

## 3.1) Phase 0 quality commands

```bash
npm run lint
npm run format:check
npm run test
```

To auto-fix style issues:

```bash
npm run lint:fix
npm run format
```

If you want to enable git pre-commit checks (husky):

```bash
npx husky init
```

Health check:

- `GET http://localhost:5000/health`

## 4) Auth API (ready now)

Base URL: `http://localhost:5000/api/v1`

- `POST /auth/signup`
  - Body: `{ "fullName": "Faraz", "email": "faraz@example.com", "password": "password123" }`
- `POST /auth/login`
  - Body: `{ "email": "faraz@example.com", "password": "password123" }`
- `POST /auth/refresh`
  - Body: `{ "refreshToken": "<refresh-token>" }`
- `GET /auth/me`
  - Header: `Authorization: Bearer <token>`
- `POST /auth/logout`
  - Header: `Authorization: Bearer <access-token>`
  - Body (optional): `{ "refreshToken": "<refresh-token>" }`

Auth responses return:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "fullName": "...",
    "email": "..."
  }
}
```

## 4.1) User preferences API (Phase 1)

- `GET /api/v1/users/preferences`
  - Header: `Authorization: Bearer <access-token>`
- `PATCH /api/v1/users/preferences`
  - Header: `Authorization: Bearer <access-token>`
  - Body fields: `alertSensitivity`, `defaultSessionLength`, `breakInterval`, `pushNotifications`, `preSessionReminder`, `reminderTime`, `streakReminder`, `theme`

## 5) AI Proxy (ready now)

- `POST /api/v1/ai/predict`
  - Proxies request to Python AI service `/predict`

## 5.1) AI Planner Engine (Phase 5)

- `POST /api/v1/planner/generate`
  - Header: `Authorization: Bearer <access-token>`
  - Body (optional):
    - `weekStartDate` (ISO date)
    - `availableMinutesPerDay` (30-480)
    - `topicIds` (array of topic IDs)
    - `preferenceByTopic` (record of topicId -> 0..100)
  - Result: Saves generated weekly plan into `planner_sessions` and returns created entries.

## 6) Reports + Async Jobs (Phase 6)

- `POST /api/v1/reports/:sessionId/generate`
  - Header: `Authorization: Bearer <access-token>`
  - Queues async report generation for a completed session.

- `GET /api/v1/reports/:sessionId/status`
  - Header: `Authorization: Bearer <access-token>`
  - Returns status: `queued|processing|completed|failed|dead-letter`.

- `GET /api/v1/reports/:sessionId/download`
  - Header: `Authorization: Bearer <access-token>`
  - Downloads generated PDF artifact when report status is `completed`.

## 7) Performance + Observability (Phase 7)

- `GET /api/v1/observability/metrics`
  - Header: `Authorization: Bearer <access-token>`
  - Returns request totals, p50/p95 latency, error-budget status, and per-route latency snapshots.

- `GET /api/v1/reports/summary?range=7d|30d|all&subjectId=all|<subjectId>`
  - Header: `Authorization: Bearer <access-token>`
  - Returns cached report summary metrics (`sessionsCount`, `avgFocusPercent`, `totalMinutes`, `bestFocusPercent`).

Load test utility:

```bash
ACCESS_TOKEN=<jwt> node tests/load/reports-summary.load.mjs
```

Monitoring and alert baselines are documented in `backend/docs/phase7-monitoring.md`.

## 8) Production Readiness + CI/CD (Phase 8)

CI workflow:

- `.github/workflows/ci.yml`
  - Backend: lint + tests + npm audit
  - Frontend: build + npm audit
  - AI service: ruff + black --check + pytest + pip-audit

Environment profiles:

- Backend: `.env.development.example`, `.env.staging.example`, `.env.production.example`
- Frontend: `../frontend/.env.development.example`, `../frontend/.env.staging.example`, `../frontend/.env.production.example`
- AI service: `../ai-service/.env.development.example`, `../ai-service/.env.staging.example`, `../ai-service/.env.production.example`

Runbooks:

- Backup/restore: `backend/docs/runbook-backup-restore.md`
- Incident + rollback: `backend/docs/runbook-incident-rollback.md`
- Phase 8 summary: `backend/docs/phase8-production-readiness.md`

## Notes

- MongoDB is required; backend exits if MongoDB is unavailable.
- Redis is optional for now; backend continues if Redis is down.
- AI service is optional for now; health endpoint reports `healthy: false` when unavailable.
- Placeholder module routes for upcoming phases are already scaffolded and currently return HTTP 501.
