# FocusIQ

AI-Powered Smart Study Planner  
Product Requirements and System Documentation

Version 1.0  
Date: April 2026  
Classification: Confidential - Internal Use Only

## 1. Executive Summary

FocusIQ is an AI-powered web app that helps students plan, execute, and reflect on study sessions using emotion detection, gesture recognition, focus tracking, and session analytics.

It combines webcam-based computer vision, real-time alerts, and post-session reports to turn passive study time into measurable, guided learning.

### Core Value Proposition

FocusIQ closes the gap between sitting to study and actually focusing by offering:
- Tutor-like accountability
- Behavioral insight
- Productivity analytics in one browser experience

### Key Capabilities

| Capability | Description |
|---|---|
| Emotion Detection | Real-time face analysis across 7 emotional states |
| Gesture Recognition | Detects nodding, slouching, yawning, hand-to-face, and attention-related gestures |
| Mood Assessment | Combines emotion + gesture to produce study-readiness score |
| Focus Monitoring | Tracks gaze, eye closure, and attention deviation each second |
| Alert System | Escalating alerts from gentle nudge to session pause |
| Session Analytics | Auto-generated downloadable PDF report with insights |
| Study Planner | AI scheduling from topics, deadlines, and focus history |
| Adaptive Breaks | Recommends break patterns based on fatigue signals |

## 2. Product Vision and Goals

### Problem Statement

Traditional planners schedule study but do not evaluate attention quality. Students lose focus without feedback and lack data for improvement.

### Vision Statement

Create an intelligent study companion that understands emotional state and focus quality, provides real-time intervention, and enables continuous improvement.

### Primary Goals

1. Detect and react to emotional state in real time through webcam AI.
2. Identify focus lapses and deliver context-sensitive alerts.
3. Produce actionable post-session analytics.
4. Build an intelligent planner using workload, deadlines, and focus history.
5. Maintain accessibility, privacy, and usability.

### Success Metrics

| Metric | Target |
|---|---|
| Emotion detection accuracy | >= 87% |
| Focus alert false positive rate | < 8% |
| Session report generation time | < 5 seconds |
| Student-reported focus improvement | >= 25% after 2 weeks |
| Planner adherence rate | >= 70% |
| Page load time | < 2 seconds |

## 3. User Personas

### Primary Persona: Aisha (20, University Student)
- Needs: Real-time alerts, planning, topic progress tracking
- Frustrations: No drift feedback, unclear prep quality
- Goals: Better scores, efficient studying

### Secondary Persona: Hassan (17, High School Student)
- Needs: Strong distraction alerts, streaks, accountability
- Frustrations: Cannot measure productive study time
- Goals: Habit consistency, exam readiness

### Tertiary Persona: Dr. Sara (Educator/Parent)
- Needs: Session export, trend dashboards, preparation gap insight
- Goals: Data-driven coaching and support

## 4. System Architecture

### High-Level Architecture

FocusIQ uses a modular event-driven architecture with React frontend, Node.js and Python backend services, and AI microservices.

| Layer | Technology / Responsibility |
|---|---|
| Frontend | React 18, TypeScript, TailwindCSS |
| Vision Pipeline | MediaPipe Holistic + TensorFlow.js |
| Emotion AI Service | Python FastAPI (CNN classifier) |
| Focus Analyzer | Node.js service |
| Planner Engine | Python |
| Session Recorder | PostgreSQL |
| Report Generator | Python ReportLab / PDFKit |
| Auth and Storage | Supabase |
| Notification Bus | WebSockets |

### Data Flow

1. Student starts session and webcam stream starts.
2. MediaPipe extracts landmarks at 10 FPS.
3. Landmarks sent over WebSocket to Emotion and Focus services.
4. Emotion label returns every 2 seconds.
5. Focus score returns every 1 second.
6. Alert engine evaluates thresholds and triggers alerts.
7. Events are timestamped and persisted.
8. Session-end report is generated from event stream.

## 5. AI Modules Detailed Specification

### 5.1 Emotion Detection

Model classifies into 7 emotion states: engaged, neutral, confused, bored, stressed, tired, frustrated.

- Input: 48x48 grayscale face crop
- Architecture: 5-layer CNN + 2 Dense + Softmax
- Latency target: < 80ms CPU, < 20ms GPU
- Confidence policy: < 60% mapped to Neutral

### 5.2 Gesture Recognition

Based on MediaPipe Holistic (pose + face landmarks).

| Gesture | Detection | Trigger |
|---|---|---|
| Yawning | Mouth aspect ratio > 0.6 for > 1.5s | Fatigue warning |
| Head drooping | Nose tip Y below baseline | Drowsiness alert |
| Looking away | Face yaw > 30 degrees for > 5s | Distraction alert |
| Phone gesture | Hand near face + face down | Phone warning |
| Slouching | Shoulder drop > 15% from baseline | Posture advisory |
| Head nodding | Repeated vertical movement | Positive reinforcement |
| Face-in-hands | Hand overlap with face region | Fatigue/frustration signal |

### 5.3 Study Readiness Score (SRS)

Formula:

SRS = (Emotion * 0.45) + (Posture * 0.25) + (Blink * 0.20) + (History * 0.10)

Ranges:
- Green: >= 70 (full session)
- Amber: 45-69 (shorter session + warm-up)
- Red: < 45 (rest recommendation)

### 5.4 Real-Time Focus Monitor

| Signal | Weight |
|---|---|
| Gaze on screen | 35% |
| Eye openness (EAR) | 25% |
| Face presence | 20% |
| Head orientation | 15% |
| Blink rate normality | 5% |

### 5.5 Alert Engine

| Level | Trigger | Alert Type | Required Action |
|---|---|---|---|
| Level 1 | Focus < 60 for 20s | Border pulse | None |
| Level 2 | Focus < 45 for 40s or bored/tired | Banner + chime | Dismiss or break |
| Level 3 | Focus < 30 for 60s or gaze away > 90s | Full-screen alert | Confirm return |
| Level 4 | 3x Level 3 in one session | Auto-pause | Manual resume |

## 6. AI Study Planner

Inputs:
- Subjects and topics with estimated hours
- Deadlines
- Difficulty ratings
- Daily availability
- Session length and break preference
- Historical peak-focus windows

Priority model:

Priority = (Deadline Urgency * 0.40) + (Difficulty * 0.30) + (Preparation Gap * 0.20) + (User Preference * 0.10)

Planner behavior:
- Hard tasks in peak-focus windows
- Easier reviews in low-focus windows
- Contextual reminders (streaks, gaps, mood, pre-session)

## 7. Session Analytics Report

Each session produces a PDF report with:
- Session summary and score block
- Focus timeline chart
- Emotion distribution chart
- Preparation completeness by topic
- Behavioral insights paragraph
- Recommendations for next sessions

## 8. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Webcam access with consent and real-time processing | Must Have |
| FR-02 | Emotion classification every 2s with >= 85% accuracy | Must Have |
| FR-03 | Detect yawning, looking away, slouching | Must Have |
| FR-04 | Compute SRS before each session | Must Have |
| FR-05 | Per-second focus score (0-100) | Must Have |
| FR-06 | Level 1 to 3 alert logic per thresholds | Must Have |
| FR-07 | Auto-pause after 3 Level 3 alerts | Must Have |
| FR-08 | Weekly planner from topics/deadlines/availability | Must Have |
| FR-09 | Smart reminders at intervals and triggers | Should Have |
| FR-10 | Post-session PDF in < 5 seconds | Must Have |
| FR-11 | Report includes timeline, emotion chart, completion, insights | Must Have |
| FR-12 | Per-user historical storage | Must Have |
| FR-13 | Topic CRUD support | Must Have |
| FR-14 | Responsive desktop/tablet + dark mode | Should Have |
| FR-15 | No webcam raw storage; derived features only | Must Have |

## 9. Non-Functional Requirements

### Performance
- Frame processing latency < 100ms
- Emotion API p95 < 200ms
- Dashboard load < 2 seconds
- Support >= 10,000 active sessions

### Privacy and Security
- Never store raw webcam frames
- Only anonymized feature vectors leave client
- TLS 1.3 in transit, AES-256 at rest
- User data deletion support
- No ad SDKs using biometric data

### Accessibility
- WCAG 2.1 AA
- Alerts available in visual, audio, and text channels
- Screen-reader-friendly report alternative

### Reliability
- 99.5% uptime target
- Graceful timer-only mode if AI unavailable
- Offline basic planner + Pomodoro mode

## 10. UI/UX Guidelines

### Design Principles
- Calm productivity with deep navy, soft cyan, white
- Always-visible key indicators (focus, time, emotion)
- Non-intrusive alert escalation
- Positive reinforcement equally visible as warnings

### Key Screens

| Screen | Key Elements |
|---|---|
| Dashboard | Upcoming sessions, streak, quick start, last session summary |
| Session View | Webcam tile, focus meter, emotion badge, timer, progress, overlays |
| Pre-Session Readiness | SRS gauge, calibration animation, recommendation card |
| Planner | Weekly grid, topic blocks, deadline indicators, drag-reschedule |
| Session Report | Charts, insights card, completion table, download action |
| Settings | Permissions, alert sensitivity, schedule and notifications |

## 11. Technology Stack

| Category | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS + Radix UI |
| Client Vision | MediaPipe Holistic |
| Client ML | TensorFlow.js |
| Backend API | Node.js + Express |
| AI Services | Python + FastAPI |
| Emotion Model | PyTorch CNN |
| Database | PostgreSQL + Supabase |
| Real-time | WebSockets / Socket.io |
| PDF | ReportLab |
| Auth | Supabase Auth |
| Deployment | Vercel + Railway |

## 12. Development Roadmap

### Phase 1 (Weeks 1-6)
- Core UI and basic planner
- Face detection + basic focus monitor
- Level 1-2 alerts
- Session summary card
- Auth and topic management

### Phase 2 (Weeks 7-12)
- Emotion service and gesture recognition
- SRS calibration
- Level 3-4 escalation
- Full PDF reporting
- Smart reminders

### Phase 3 (Weeks 13-18)
- AI planner and historical trends
- LLM-generated insights
- Adaptive break recommendations
- Mobile optimization
- Parent/educator sharing

### Phase 4 (Post-launch)
- React Native app
- LMS integrations
- Multi-language support
- Group study mode

## 13. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low-quality webcam | High | High | Calibration flow + fallback inputs |
| Privacy concerns | Medium | High | Local-first processing + explicit consent |
| High browser CPU usage | Medium | Medium | Adaptive FPS + worker offloading |
| Emotion misclassification | Medium | Medium | Confidence gating + smoothing |
| Camera-off bypass | Medium | Low | Timer-only mode with reduced insight |
| PDF failure on long sessions | Low | Medium | Chunk processing + CSV fallback |

## 14. Glossary

| Term | Definition |
|---|---|
| SRS | Study Readiness Score before session |
| Focus Score | Per-second attention quality score |
| EAR | Eye Aspect Ratio for drowsiness/blinks |
| MediaPipe Holistic | Face, pose, and hand landmark pipeline |
| FER-2013 | Emotion recognition benchmark dataset |
| Alert Escalation | Progressive alert levels based on inattention |
| Preparation Completeness | Planned vs covered topics at acceptable focus |
| Peak Focus Window | Time periods with highest historical focus |
| Session Analytics Document | Auto-generated post-session PDF |
| Adaptive Break | Fatigue-based dynamic break recommendation |

## Appendix A: Document Info

| Field | Value |
|---|---|
| Title | FocusIQ Product and System Documentation |
| Version | 1.0 |
| Status | Draft for Review |
| Date | April 2026 |
| Classification | Confidential - Internal Use Only |
| Sections | 14 + Appendix |
| Next Review | June 2026 |

### Change Log
- v1.0 (April 2026): Initial product and system documentation with architecture, modules, requirements, roadmap, and risks.

### Deployment Reference

| Service | Host | Why |
|---|---|---|
| React frontend | Vercel | CI/CD and CDN |
| Node.js backend | Railway | WebSocket-friendly runtime |
| Python AI services | Railway Docker | Independent service scaling |
| Database | Supabase | Managed Postgres + auth + realtime |
| Redis | Railway | Low-latency co-location with backend |
