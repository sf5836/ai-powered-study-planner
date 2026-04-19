# FocusIQ Backend Implementation Blueprint (Phase-by-Phase)

Version: 1.0  
Date: April 2026  
Scope: Backend only (Node.js API + Python AI services + MongoDB + Redis)

## 1. Purpose

This document defines the complete backend target architecture and a practical phase-by-phase implementation plan.

Goals:
- Build a production-ready backend that matches FocusIQ product requirements.
- Use Node.js for core backend APIs, auth, orchestration, and real-time session channels.
- Use Python for AI inference and AI planning/reporting services.
- Use local MongoDB as the primary database and Redis for caching, session state, pub/sub, and rate limiting.
- Deliver in phases so each phase is testable and deployable.

## 2. Target Backend Architecture

## 2.1 Service Responsibilities

1. API Gateway / Core Backend (Node.js + Express)
- Auth and user management
- Topic and planner CRUD
- Session lifecycle APIs
- Aggregation and reporting orchestration
- WebSocket gateway for real-time signals
- Calls Python AI services through internal HTTP

2. AI Inference Service (Python + FastAPI)
- Emotion inference endpoint(s)
- Focus score inference endpoint(s)
- Readiness score computation endpoint
- Stateless, low-latency inference APIs

3. AI Planner Service (Python + FastAPI)
- Smart study schedule generation
- Priority scoring using deadline, difficulty, preparation gap, history
- Adaptive recommendations for next sessions

4. Report Service (Python + FastAPI)
- Session summary generation
- Insight text generation
- PDF report generation

5. Worker Service (Node.js BullMQ or Python Celery)
- Async jobs: report generation, reminders, digest emails, heavy analytics recomputation

6. Data Stores
- MongoDB: primary document data store
- Redis: cache, token blacklist, pub/sub, rate limit counters, job queues, ephemeral live state

## 2.2 High-Level Request Flow

1. Frontend calls Node.js API (JWT-authenticated).
2. Node.js validates request and writes/reads MongoDB.
3. For AI operations, Node.js calls Python AI service(s).
4. Real-time session events stream via WebSocket to Node.js.
5. Node.js persists key events in MongoDB and keeps short-lived session state in Redis.
6. On session end, Node.js enqueues report job in Redis-backed queue.
7. Worker calls report service, stores report metadata/URL, returns completion status.

## 2.3 Technology Baseline

Core API:
- Node.js 20+
- Express
- PostgreSQL driver/ORM: Prisma (recommended) or Sequelize/TypeORM
- Redis client: ioredis (recommended)
- WebSocket: socket.io
- Validation: zod
- Auth: JWT + refresh token rotation
- Queue: BullMQ

AI Services:
- Python 3.11+
- FastAPI
- Pydantic
- Uvicorn/Gunicorn
- Model packaging and versioning folder inside ai-service

Infrastructure:
- Docker Compose (dev)
- Environment-based config
- OpenTelemetry + Prometheus metrics (phase 6+)

## 3. Recommended Repository Structure

## 3.1 Node Backend Structure

```text
backend/
  docs/
    backend-phase-plan.md
  src/
    app.js
    server.js
    config/
      env.js
      logger.js
      redis.js
      db.js
    modules/
      auth/
        auth.controller.js
        auth.service.js
        auth.repository.js
        auth.routes.js
        auth.validation.js
      users/
      subjects/
      topics/
      planner/
      sessions/
      reports/
      notifications/
    realtime/
      socket.gateway.js
      session.events.js
    jobs/
      queue.js
      processors/
        report.processor.js
        reminder.processor.js
    middleware/
      auth.middleware.js
      rateLimit.middleware.js
      error.middleware.js
      requestId.middleware.js
    shared/
      constants/
      utils/
      errors/
      dto/
    tests/
      integration/
      unit/
  prisma/
    schema.prisma
    migrations/
  package.json
  Dockerfile
```

## 3.2 Python AI Services Structure

```text
ai-service/
  app/
    main.py
    api/
      v1/
        health.py
        emotion.py
        focus.py
        readiness.py
        planner.py
        reports.py
    core/
      config.py
      logging.py
    models/
      emotion/
      focus/
      readiness/
    services/
      emotion_service.py
      focus_service.py
      planner_service.py
      report_service.py
    schemas/
      emotion_schema.py
      focus_schema.py
      planner_schema.py
      report_schema.py
    workers/
      tasks.py
    tests/
  requirements.txt
  requirements-dev.txt
  Dockerfile
```

## 4. Data Model (PostgreSQL)

## 4.1 Core Tables

1. users
- id (uuid, pk)
- email (unique)
- password_hash
- full_name
- avatar_url
- timezone
- created_at, updated_at

2. user_preferences
- user_id (pk/fk users.id)
- alert_sensitivity (low/medium/high)
- default_session_length
- break_interval
- push_notifications
- pre_session_reminder
- reminder_time
- streak_reminder
- theme (light/dark/system)

3. subjects
- id (uuid, pk)
- user_id (fk)
- name
- color
- created_at, updated_at

4. topics
- id (uuid, pk)
- subject_id (fk)
- user_id (fk)
- name
- difficulty (1-5)
- deadline
- estimated_minutes
- preparation_percent
- created_at, updated_at

5. planner_sessions
- id (uuid, pk)
- user_id (fk)
- subject_id (fk)
- topic_id (nullable fk)
- topic_name
- start_at (timestamp)
- duration_minutes
- notes
- status (scheduled/completed/skipped)
- created_at, updated_at

6. study_sessions
- id (uuid, pk)
- user_id (fk)
- subject_id (fk)
- topic_id (nullable fk)
- topic_name
- started_at
- ended_at
- duration_minutes
- avg_focus_percent
- readiness_score
- alert_count_l1
- alert_count_l2
- alert_count_l3
- status (completed/aborted)
- created_at

7. session_focus_points
- id (bigserial, pk)
- session_id (fk)
- second_offset
- focus_percent
- created_at

8. session_emotion_points
- id (bigserial, pk)
- session_id (fk)
- second_offset
- emotion_label
- confidence
- created_at

9. session_gesture_points
- id (bigserial, pk)
- session_id (fk)
- second_offset
- looking_away
- yawning
- slouching
- phone_detected
- created_at

10. reports
- id (uuid, pk)
- session_id (fk)
- user_id (fk)
- pdf_url
- summary_json
- generated_at
- status (queued/generating/completed/failed)

11. reminders
- id (uuid, pk)
- user_id (fk)
- type (pre_session/streak/deadline)
- scheduled_for
- status

12. refresh_tokens
- id (uuid, pk)
- user_id (fk)
- token_hash
- expires_at
- revoked_at

## 4.2 Redis Keys (Reference)

- session:live:{sessionId} -> hash of ephemeral session state
- user:presence:{userId} -> online/offline for ws
- ratelimit:{route}:{userOrIp} -> counter with ttl
- cache:dashboard:{userId} -> dashboard aggregate json
- cache:reports:{userId}:{range} -> reports aggregate json
- queue:reports / queue:reminders -> BullMQ queues
- pubsub:session-events -> stream channel for real-time broadcasting

## 5. API Contract (Node.js)

## 5.1 Auth

- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me

## 5.2 Planner and Topics

- GET /api/v1/subjects
- POST /api/v1/subjects
- PATCH /api/v1/subjects/:id
- DELETE /api/v1/subjects/:id

- GET /api/v1/topics
- POST /api/v1/topics
- PATCH /api/v1/topics/:id
- DELETE /api/v1/topics/:id

- GET /api/v1/planner/sessions
- POST /api/v1/planner/sessions
- PATCH /api/v1/planner/sessions/:id
- DELETE /api/v1/planner/sessions/:id

## 5.3 Live Session

- POST /api/v1/study-sessions/start
- POST /api/v1/study-sessions/:id/events
- POST /api/v1/study-sessions/:id/pause
- POST /api/v1/study-sessions/:id/resume
- POST /api/v1/study-sessions/:id/end

## 5.4 Reports and Analytics

- GET /api/v1/reports/sessions?range=7d|30d|all&subjectId=...
- GET /api/v1/reports/summary?range=...
- POST /api/v1/reports/:sessionId/generate
- GET /api/v1/reports/:sessionId/download

## 5.5 AI Endpoints (Internal)

Node -> Python (internal network only)
- POST /ai/v1/emotion/predict
- POST /ai/v1/focus/predict
- POST /ai/v1/readiness/score
- POST /ai/v1/planner/generate
- POST /ai/v1/reports/generate

## 6. Real-Time Design

Transport: socket.io namespace /study

Main events:
- client:session:start
- client:focus:update
- client:emotion:update
- client:gesture:update
- client:session:pause
- client:session:resume
- client:session:end
- server:alert
- server:session:state
- server:report:ready

Rules:
- Persist essential events every N seconds (for example 5s batch) and on critical transitions.
- Store only derived features and metrics, never raw webcam frames.

## 7. Security, Privacy, and Compliance

1. Never store raw webcam video frames.
2. Store only derived features and model outputs.
3. JWT short-lived access token + rotating refresh tokens.
4. Hash passwords with bcrypt/argon2.
5. Role-based authorization hooks (student, admin in later phase).
6. Input validation on every write endpoint.
7. Rate limiting on auth and high-cost routes.
8. Audit logging for session/report generation actions.
9. Data retention policy for event granularity (for example aggregate old per-second data after 90 days).

## 8. Phase-by-Phase Delivery Plan

## Phase 0: Foundation and Standards (1 week)

Deliverables:
- Finalize architecture and API naming conventions.
- Pick ORM (Prisma recommended).
- Setup linting, formatting, test runner, commit hooks.
- Add folder structure skeleton in backend and ai-service.
- Add docker-compose services for postgres, redis, backend, ai-service.

Acceptance:
- All services boot with health endpoints.
- Local dev one-command start works.
- Frontend integration for Phase 0 is completely connected and verified working.

## Phase 1: Auth + User Preferences (1-2 weeks)

Deliverables:
- Signup/login/logout/refresh/me APIs.
- users, user_preferences, refresh_tokens tables.
- JWT auth middleware and route protection.

Acceptance:
- Frontend login/signup can call real endpoints.
- Token refresh and logout invalidation work.
- Frontend integration for Phase 1 is completely connected and verified working.

## Phase 2: Subjects/Topics/Planner CRUD (1-2 weeks)

Deliverables:
- Subjects, topics, planner_sessions APIs.
- Validation and ownership checks.
- Basic query indexes and pagination.

Acceptance:
- Planner UI can fully read/write to backend.
- All CRUD paths tested with integration tests.
- Frontend integration for Phase 2 is completely connected and verified working.

## Phase 3: Live Study Session Persistence (1-2 weeks)

Deliverables:
- Start/pause/resume/end study session APIs.
- Event ingestion endpoint and/or socket gateway.
- study_sessions + per-second points tables.
- Redis ephemeral live state.

Acceptance:
- Session data persists and appears in reports page.
- No data loss when reconnecting during active session.
- Frontend integration for Phase 3 is completely connected and verified working.

## Phase 4: AI Inference Integration (Python) (2 weeks)

Deliverables:
- Python inference endpoints for emotion/focus/readiness.
- Node adapter client with retries/timeouts/circuit behavior.
- Feature schemas and versioning for model input/output.

Acceptance:
- End-to-end flow: Node receives client event -> Python inference -> Node stores result -> frontend sees update.
- p95 latency targets measured.
- Frontend integration for Phase 4 is completely connected and verified working.

## Phase 5: AI Planner Engine (Python) (1-2 weeks)

Deliverables:
- planner/generate endpoint.
- Priority algorithm from requirements:
  Priority = (Urgency * 0.40) + (Difficulty * 0.30) + (Preparation Gap * 0.20) + (Preference * 0.10)
- Save generated plan into planner_sessions.

Acceptance:
- User can request generated weekly plan.
- Plan quality baseline verified against test fixtures.
- Frontend integration for Phase 5 is completely connected and verified working.

## Phase 6: Reports + Async Jobs (1-2 weeks)

Deliverables:
- Queue-based report generation.
- PDF generation service.
- Reports APIs and file storage integration.

Acceptance:
- Session-end report generated asynchronously and downloadable.
- Failed jobs retried and dead-lettered.
- Frontend integration for Phase 6 is completely connected and verified working.

## Phase 7: Performance, Observability, and Hardening (1-2 weeks)

Deliverables:
- Metrics, tracing, structured logs, error budgets.
- Redis caching for dashboard and reports summary.
- Load tests and query optimization.

Acceptance:
- Dashboard/report APIs under target response times.
- Monitoring dashboards and alert rules ready.
- Frontend integration for Phase 7 is completely connected and verified working.

## Phase 8: Production Readiness and CI/CD (1 week)

Deliverables:
- CI pipelines for lint, test, build, security scan.
- Environment profiles (dev/staging/prod).
- Backup/restore docs and runbooks.

Acceptance:
- Staging deployment stable.
- Rollback and incident runbook validated.
- Frontend integration for Phase 8 is completely connected and verified working.

## 9. Environment Variables (Target)

## 9.1 Node Backend

- NODE_ENV
- PORT
- DATABASE_URL
- REDIS_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- ACCESS_TOKEN_TTL
- REFRESH_TOKEN_TTL
- AI_SERVICE_URL
- REPORT_SERVICE_URL
- CORS_ORIGIN

## 9.2 Python AI Service

- HOST
- PORT
- MODEL_PATH_EMOTION
- MODEL_PATH_FOCUS
- LOG_LEVEL
- MAX_WORKERS

## 10. Testing Strategy

1. Unit tests
- Services, utilities, algorithm modules

2. Integration tests
- API + DB + Redis with test containers

3. Contract tests
- Node/Python AI request-response schemas

4. Load tests
- Session event ingestion throughput
- Reports summary endpoint

5. End-to-end checks
- Login -> planner -> session start/end -> report generation

## 11. Migration Note for Current Repository

Current state includes:
- Node backend health endpoint in backend/src/server.js
- Python ai-service health and basic /predict endpoint in ai-service/app/main.py
- Redis and backend and ai-service in docker-compose

Next implementation steps based on this document:
1. Add PostgreSQL container and migrate from ad-hoc Mongo usage to PostgreSQL schema.
2. Introduce modular backend folder layout (modules, middleware, jobs, realtime).
3. Split Python service into AI endpoints by domain (emotion/focus/planner/reports).
4. Replace frontend mock service calls with real API and socket integrations phase by phase.

## 12. Done Criteria Per Phase

A phase is complete only when all below are true:
- API contracts documented and versioned.
- Code merged with tests passing.
- Docker local stack runs without manual patching.
- Observability and error handling for that phase are in place.
- Frontend integration points for that phase are verified.

---

This document is the implementation source of truth for backend execution.
Any architectural change should be updated here before coding starts.
