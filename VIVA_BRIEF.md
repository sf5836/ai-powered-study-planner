# FocusIQ - AI-Powered Study Planner (Viva Preparation)

## 1) Project Overview
FocusIQ is an AI-powered study planner that combines:
- Study planning (subjects, topics, calendar sessions)
- Live study sessions with webcam-based attention signals
- Real-time analytics (focus, readiness, emotions)
- Reports and summaries after each session
- Notifications for key events

Goal: help students plan, execute, and improve study habits through real-time feedback and intelligent scheduling.

## 2) Key Features (User Perspective)
1. Authentication: sign up/login with JWT.
2. Dashboard: summary, quick start, stats, upcoming sessions.
3. Planner: AI-generated weekly plan, session scheduling, subjects.
4. Session: live webcam feed, focus score, emotions, gesture detection.
5. Reports: session summaries, focus/emotion trends.
6. Settings: preferences, webcam test, reminders, notifications.
7. Notifications: realtime updates (session start/end, system alerts).

## 3) Architecture (High Level)
Frontend (React + Vite)
- UI and state management
- WebSocket client for realtime updates
- Webcam capture + MediaPipe for gestures

Backend (Node + Express + MongoDB)
- REST API for auth, sessions, planner, reports
- WebSocket server (Socket.IO)
- Stores sessions, notifications, reports

AI Service (FastAPI)
- Focus/emotion/readiness inference
- Heuristic models (Phase 0 scaffold)

## 4) Real-Time Data Flow (Core Viva Topic)
Session Flow
1. User starts session.
2. Frontend captures webcam + gestures (MediaPipe).
3. Frontend sends signals every second.
4. Backend calls AI service -> gets focus/emotion/readiness.
5. Backend saves point -> emits Socket.IO update.
6. Frontend updates UI instantly.

Realtime Events (Socket.IO)
- session:update: focus, emotion, readiness updates
- session:end: refresh reports
- notifications:new: live notification updates

## 5) AI / Gesture Detection (What Makes It Smart)
Inputs
- Looking away (face missing / head turn)
- Slouching (face size ratio)
- Yawning (mouth open ratio from FaceMesh)
- Eyes closed (eye aspect ratio from FaceMesh)
- Phone detection (COCO-SSD TFJS, throttled)

Outputs
- Focus score (0-100)
- Readiness score (0-100)
- Emotion label + confidence

Note: current AI is heuristic (Phase 0). It is expandable to real ML models.

## 6) Data Model (MongoDB)
StudySession
- status, start/end time, duration
- avg focus, readiness, alerts

SessionFocusPoint
- per-second focus/emotion/readiness
- alert flags

Notification
- type, title, message, status

UserPreference
- session length, reminder time, theme, etc.

## 7) APIs (Examples)
Auth
- POST /api/v1/auth/login
- POST /api/v1/auth/signup

Planner
- GET /api/v1/subjects
- POST /api/v1/planner/generate

Sessions
- POST /api/v1/sessions/start
- POST /api/v1/sessions/:id/events

Reports
- GET /api/v1/reports/summary

Notifications
- GET /api/v1/notifications
- POST /api/v1/notifications

## 8) Frontend Modules
- pages/Session.tsx: live session UI
- hooks/useSessionSignals.ts: MediaPipe + TFJS
- hooks/useRealtimeSync.ts: Socket.IO updates
- stores/*: Zustand state management
- components/notifications/*: notifications panel

## 9) Security and Reliability
- JWT auth on backend routes
- Input validation for session payload
- Socket events emitted by backend
- CORS configured for frontend

## 10) Testing/Validation
Manual functional testing:
- Start session
- Move away -> looking away triggered
- Yawn -> yawning flag
- Phone detection in frame
- End session -> report + notification

## 11) Known Limitations (Be Honest in Viva)
- AI service currently heuristic
- Phone detection depends on lighting and clarity
- Emotion labels approximate, not clinical
- Push notifications use browser permission

## 12) Future Enhancements
- Replace heuristics with trained ML models
- Improved face tracking (3D head pose)
- Mobile app version
- More analytics: streak graphs, time-of-day focus

## 13) Demo Script (Viva Practical)
1. Login -> Home shows personalized greeting.
2. Planner: generate weekly plan.
3. Start session from dashboard.
4. Live webcam, focus score updates.
5. Look away -> detects looking away.
6. Yawn -> yawning triggers.
7. End session -> report + notification.

## 14) Viva Q&A Ready Points
Q: Why use MediaPipe + TFJS?
A: Cross-platform, runs fully in browser, no heavy backend compute.

Q: How does realtime work?
A: WebSocket pushes session updates; UI updates instantly.

Q: Why separate AI service?
A: Modular scaling; allows AI evolution without backend rewrite.
