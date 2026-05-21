# Implementation Guide (Step by Step)

This document walks through the full implementation flow for the project: backend, AI service, and frontend.

## 1) Prerequisites
- Node.js 18+
- Python 3.11
- MongoDB running locally or via Docker
- Redis running locally or via Docker (for queues and socket scaling)

## 2) Repository Structure
- frontend/: React + Vite UI
- backend/: Node + Express API and Socket.IO
- ai-service/: FastAPI AI service
- redis/: Redis config

## 3) Environment Setup

### 3.1 Backend
1. Create a .env in backend/ (copy from README or sample).
2. Set:
   - PORT
   - MONGO_URI
   - JWT_SECRET
   - AI_SERVICE_URL
   - REDIS_URL
3. Install dependencies:
   - cd backend
   - npm install

### 3.2 AI Service
1. Create venv:
   - cd ai-service
   - python3.11 -m venv .venv
   - source .venv/bin/activate
2. Install dependencies:
   - pip install -r requirements.txt
   - pip install -r requirements-dev.txt

### 3.3 Frontend
1. Install dependencies:
   - cd frontend
   - npm install
2. Create .env (if needed for API URL):
   - VITE_API_URL
   - VITE_SOCKET_URL

## 4) Start Services (Local)

### 4.1 AI Service
- cd ai-service
- source .venv/bin/activate
- uvicorn app.main:app --host 0.0.0.0 --port 8001

### 4.2 Backend
- cd backend
- npm run dev

### 4.3 Frontend
- cd frontend
- npm run dev

## 5) Backend Implementation (Step by Step)

### 5.1 Core Setup
1. Initialize Express app in backend/src/app.js.
2. Configure env loader and logger.
3. Connect to MongoDB in backend/src/config/mongo.js.
4. Set up global middleware:
   - request ID
   - rate limiting
   - request metrics
   - error handler

### 5.2 Auth
1. Define User model (backend/src/models/User.js).
2. Create auth routes and controllers under backend/src/modules/auth/.
3. Add JWT middleware in backend/src/middleware/auth.js.

### 5.3 Sessions and Signals
1. Create StudySession and SessionFocusPoint models.
2. Implement session start and event ingestion routes:
   - POST /api/v1/sessions/start
   - POST /api/v1/sessions/:id/events
3. On each event batch:
   - Call AI service
   - Save focus point
   - Emit Socket.IO event

### 5.4 Planner and Reports
1. Create subject/topic models.
2. Implement planner generate route.
3. Create report model and summary API.

### 5.5 Notifications
1. Create Notification model.
2. On session start/end, create a notification.
3. Emit notifications:new via Socket.IO.
4. Provide CRUD endpoints for notifications.

### 5.6 Realtime (Socket.IO)
1. Initialize Socket.IO in backend/src/server.js.
2. Emit events:
   - session:update
   - session:end
   - notifications:new
3. Allow frontend to subscribe by user/session ID.

## 6) AI Service Implementation (Step by Step)

### 6.1 FastAPI Setup
1. Create app in ai-service/app/main.py.
2. Configure routes under ai-service/app/api/v1/.
3. Add pydantic schemas for request/response.

### 6.2 Heuristic Scoring
1. Implement focus_service.py:
   - input: gesture flags and signals
   - output: focus score + category
2. Implement readiness_service.py:
   - input: fatigue patterns, breaks
   - output: readiness score + category
3. Implement emotion_service.py:
   - input: signals + heuristics
   - output: emotion distribution + label
4. Implement report_service.py:
   - summary payload for backend

### 6.3 API Endpoints
1. /health
2. /focus
3. /readiness
4. /emotion
5. /report

## 7) Frontend Implementation (Step by Step)

### 7.1 Core Setup
1. Vite + React entry in frontend/src/main.tsx.
2. App routes in frontend/src/App.tsx.
3. Global styles in frontend/src/index.css.

### 7.2 State Management
1. Use Zustand stores in frontend/src/stores/.
2. Store session state, notifications, and user info.

### 7.3 Session UI
1. Implement session page in frontend/src/pages/Session.tsx.
2. Show webcam preview and realtime stats.
3. Display focus/emotion/readiness.

### 7.4 Gesture Detection (MediaPipe + TFJS)
1. Use MediaPipe Face Detection for face presence.
2. Use MediaPipe FaceMesh for eyes closed and yawning.
3. Use TFJS COCO-SSD to detect phones.
4. Compute flags and send to backend periodically.

### 7.5 Realtime Sync
1. Connect to Socket.IO in frontend/src/hooks/useRealtimeSync.ts.
2. Subscribe to:
   - session:update
   - session:end
   - notifications:new
3. Update UI and stores on events.

### 7.6 Notifications UI
1. Build notifications panel component.
2. Fetch list from backend and update via socket.
3. Show unread count in top bar.

## 8) MediaPipe Assets (Important)
1. Copy MediaPipe assets into frontend/public/mediapipe/.
2. Ensure Face Detection and FaceMesh assets exist.
3. Ensure locateFile() uses the local base path.

## 9) Testing Checklist
- Auth login/signup
- Start and end sessions
- Webcam works and gestures trigger
- Socket events update UI
- Notifications appear in panel
- Reports show after session end

## 10) Common Troubleshooting
- Gesture detection unavailable: confirm assets exist and correct base path.
- AI service error: ensure Python 3.11 and pydantic-core install.
- Socket not updating: confirm backend emits events and frontend is connected.
- Webcam black screen: check browser permissions and autoplay rules.
