# FocusIQ - Technical Implementation Details

## 1. Frontend Architecture

### 1.1 Directory Structure
```
frontend/src/
├── main.tsx                  # Application entry point
├── App.tsx                   # Route definitions & layout wrapper
├── index.css                 # Global styles
├── vite-env.d.ts            # Vite type definitions
│
├── pages/                    # Page-level components (1:1 with routes)
│   ├── Dashboard.tsx        # Home/stats page
│   ├── Planner.tsx          # Study planning interface
│   ├── Session.tsx          # Active study session
│   ├── Reports.tsx          # Analytics & history
│   ├── Settings.tsx         # User configuration
│   └── auth/
│       ├── Login.tsx        # User login
│       └── Signup.tsx       # User registration
│
├── components/              # Reusable UI components
│   ├── dashboard/
│   │   ├── LastSessionCard.tsx        # Previous session summary
│   │   ├── QuickStartButton.tsx       # Start session trigger
│   │   ├── QuickStartModal.tsx        # Session creation form
│   │   ├── StatsRow.tsx               # KPI display
│   │   ├── StreakCalendar.tsx         # Monthly streak view
│   │   ├── TodayScheduleStrip.tsx     # Today's sessions
│   │   └── UpcomingDeadlines.tsx      # Topic deadlines
│   │
│   ├── planner/
│   │   ├── AddSessionForm.tsx         # New session form
│   │   ├── CalendarGrid.tsx           # Week view calendar
│   │   ├── EditSessionModal.tsx       # Session editor
│   │   └── SubjectSidebar.tsx         # Subject list
│   │
│   ├── session/
│   │   ├── AlertOverlay.tsx           # Focus alert UI
│   │   ├── EmotionBadge.tsx           # Emotion display
│   │   ├── EmotionTimeline.tsx        # 60s emotion history
│   │   ├── FocusMeter.tsx             # Focus score display
│   │   ├── GestureStatusRow.tsx       # Gesture indicators
│   │   ├── SessionTimer.tsx           # Countdown/elapsed time
│   │   ├── StudyReadinessCard.tsx     # Readiness score
│   │   └── TopicProgressBar.tsx       # Session progress
│   │
│   ├── reports/
│   │   ├── EmotionChart.tsx           # Emotion distribution
│   │   ├── FilterBar.tsx              # Report filters
│   │   ├── FocusChart.tsx             # Focus trend
│   │   ├── SessionsTable.tsx          # Session history
│   │   ├── SummaryCards.tsx           # Report statistics
│   │   └── TopicGrid.tsx              # Topic summary
│   │
│   ├── layout/
│   │   ├── PageWrapper.tsx            # Common page layout
│   │   ├── Sidebar.tsx                # Left navigation
│   │   └── TopBar.tsx                 # Top app bar
│   │
│   └── ui/                            # Atomic UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── etc...
│
├── stores/                  # Zustand state management
│   ├── userStore.ts        # User profile & settings (persisted)
│   ├── sessionStore.ts     # Active session state
│   ├── sessionsStore.ts    # Session history
│   ├── plannerStore.ts     # Planner data (subjects/topics)
│   └── authStore.ts        # Authentication state
│
├── hooks/                   # Custom React hooks
│   ├── useSessionSignals.ts     # Webcam gesture detection ✅ NEW
│   ├── useSessionTimer.ts       # Session countdown
│   ├── useAlertEngine.ts        # Alert triggering
│   ├── useWebcam.ts             # Camera access
│   └── etc...
│
├── services/                # API clients & business logic
│   ├── api.ts              # HTTP client with auth
│   ├── authService.ts      # Auth API calls
│   ├── sessionService.ts   # Session API calls
│   ├── plannerService.ts   # Planner API calls
│   └── etc...
│
├── types/                   # TypeScript type definitions
│   └── index.ts            # Shared types & interfaces
│
└── data/                    # Static data / constants
    └── constants.ts        # App-wide constants
```

### 1.2 State Management (Zustand)

#### userStore
```typescript
// Stores: name, email, avatarUrl, theme, preferences
// Persisted: YES (localStorage key: 'focusiq-user-settings')
// Updated: Profile page, Settings page
// Accessed: Everywhere (avatar, theme, preferences)
```

#### sessionStore
```typescript
// Stores: Active session state, timer, focus/emotion/readiness scores
// Persisted: NO (lost on page reload - user can resume from backend)
// Updated: Session component, WebSocket events
// Accessed: Session page, Reports page
```

#### plannerStore
```typescript
// Stores: Subjects, topics, planner sessions for the week
// Persisted: NO (fetched from backend)
// Updated: Planner page, Add session form
// Accessed: Planner, Dashboard, Session creation
```

### 1.3 Key Hooks

#### useSessionSignals ✅ RECENTLY IMPLEMENTED
- **Purpose:** Extract gesture signals from webcam in real-time
- **Implementation:** 
  - Uses browser FaceDetector API (Chrome 90+)
  - Detects face position and size
  - Calculates: lookingAway, slouching
  - Returns: gestureFlags object every 1.2 seconds
- **Key Code:**
  ```typescript
  const faceDetector = new FaceDetector({ maxDetectedFaces: 1 });
  const detections = await faceDetector.detect(videoElement);
  if (detections.length > 0) {
    const bbox = detections[0].boundingBox;
    updateGestureFlags(bbox); // Sets lookingAway, slouching
  }
  ```

#### useSessionTimer
- **Purpose:** Track elapsed session time with HH:MM:SS format
- **Updates:** Every 1 second to sessionStore

#### useAlertEngine
- **Purpose:** Generate visual alerts based on focus drops
- **Triggers:** When focusScore < threshold

### 1.4 Component Communication Flow

```
Dashboard
├── Fetches: User stats from sessionStore
├── Displays: Last session, streaks, today's schedule
└── Actions: Click "Start Session" → QuickStartModal

QuickStartModal
├── Inputs: Subject, topic, date, time, duration
├── Validates: Subject and topic required
└── Action: POST /sessions/start → sessionStore update → Navigate to /session

Session Page
├── Initializes: useSessionSignals, useSessionTimer, WebSocket connection
├── Displays: Webcam, focus meter, emotion, timer
├── Every 1.2s: useSessionSignals extracts gestures
├── Every 3s: pushEvent() sends signals to backend
├── Response: Backend returns inference (focus %, emotion, readiness %)
├── Updates: sessionStore with new scores
└── Every 100ms: Re-render to show live scores

Reports
├── Fetches: All past sessions from backend
├── Displays: Charts, tables, statistics
├── Filters: By date, subject, etc.
└── No real-time updates needed
```

---

## 2. Backend Architecture

### 2.1 Service Structure

```
backend/src/
├── app.js                       # Express app factory
├── server.js                    # Server entry point
│
├── config/
│   ├── aiService.js            # Python AI service client
│   ├── env.js                  # Environment variables
│   ├── logger.js               # Logging setup
│   ├── mongo.js                # MongoDB connection
│   └── redis.js                # Redis connection
│
├── models/                      # Mongoose models
│   ├── User.js
│   ├── StudySession.js
│   ├── SessionFocusPoint.js
│   ├── Subject.js
│   ├── Topic.js
│   ├── PlannerSession.js
│   ├── Report.js
│   ├── Notification.js
│   ├── UserPreference.js
│   └── RefreshToken.js
│
├── modules/                     # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── auth.routes.js      # Auth endpoints
│   │   └── (auth.controller.js, auth.service.js - if split)
│   │
│   ├── sessions/
│   │   ├── sessions.routes.js  # Session CRUD & events
│   │   └── Session event handling & aggregation
│   │
│   ├── subjects/
│   │   └── subjects.routes.js  # Subject CRUD
│   │
│   ├── topics/
│   │   └── topics.routes.js    # Topic CRUD
│   │
│   ├── planner/
│   │   └── planner.routes.js   # Planner generation & CRUD
│   │
│   ├── reports/
│   │   └── reports.routes.js   # Report generation
│   │
│   ├── health/
│   │   └── health.routes.js    # Health check
│   │
│   ├── notifications/
│   │   └── (scaffolded)
│   │
│   ├── observability/
│   │   └── (scaffolded)
│   │
│   ├── users/
│   │   └── users.routes.js     # User profile endpoints
│   │
│   └── ai/
│       └── (scaffolded)
│
├── middleware/
│   ├── auth.js                 # JWT verification
│   ├── errorHandler.js         # Error handling
│   ├── rateLimit.middleware.js # Rate limiting
│   ├── requestId.middleware.js # Request ID generation
│   └── requestMetrics.middleware.js # Metrics collection
│
├── jobs/                        # Async job queue
│   ├── queue.js                # BullMQ queue setup
│   └── processors/
│       ├── reportProcessor.js
│       └── etc...
│
├── realtime/
│   ├── session.events.js       # Session event handlers (WebSocket-ready)
│   └── socket.gateway.js       # Socket.io setup (scaffolded)
│
└── shared/
    ├── constants/
    │   └── index.js            # App constants
    ├── dto/
    │   └── (Data Transfer Objects)
    ├── errors/
    │   └── custom-errors.js    # Custom error classes
    └── utils/
        ├── validators.js       # Input validation
        ├── formatters.js       # Response formatting
        └── etc...
```

### 2.2 API Routes Overview

#### Authentication Routes
```
POST   /auth/signup             # Register user
POST   /auth/login              # User login
POST   /auth/logout             # User logout
POST   /auth/refresh            # Refresh JWT token
GET    /auth/me                 # Get current user
```

#### Session Routes
```
POST   /sessions/start          # Start new session
GET    /sessions/active         # Get active session
POST   /sessions/:id/events     # Submit session event (key endpoint!)
POST   /sessions/:id/pause      # Pause session
POST   /sessions/:id/resume     # Resume session
POST   /sessions/:id/end        # End session
GET    /sessions                # Get all sessions (paginated)
```

#### Subject & Topic Routes
```
POST   /subjects                # Create subject
GET    /subjects                # List subjects
PUT    /subjects/:id            # Update subject
DELETE /subjects/:id            # Delete subject

POST   /topics                  # Create topic
GET    /topics                  # List topics (with filters)
PUT    /topics/:id              # Update topic
DELETE /topics/:id              # Delete topic
```

#### Planner Routes
```
POST   /planner/generate        # Generate weekly schedule (AI)
GET    /planner/sessions        # Get planner sessions
POST   /planner/sessions        # Create planner session
PUT    /planner/sessions/:id    # Update planner session
DELETE /planner/sessions/:id    # Delete planner session
```

#### Reports Routes
```
POST   /reports/generate        # Generate session report
GET    /reports                 # Get all reports (user's)
GET    /reports/:id             # Get specific report
```

#### Health Routes
```
GET    /health                  # Full system health check
```

### 2.3 Core Flow: Session Event Processing

```
Client (Frontend)
    ↓
POST /sessions/:id/events
{
  secondOffset: 45,
  alertLevel: 1,
  calibrationSeconds: 0,
  lookingAway: true,
  yawning: false,
  slouching: false,
  phoneDetected: false
}
    ↓
Backend: auth middleware (verify JWT)
    ↓
Backend: Find active session by ID
    ↓
Backend: Call Python AI service
  - POST /focus/predict → focusPercent
  - POST /emotion/predict → emotion, confidence
  - POST /readiness/score → readinessScore
    ↓
Backend: Create SessionFocusPoint in MongoDB
{
  sessionId, userId, timestamp,
  focusPercent, emotion, confidence, readinessScore,
  alertLevel, lookingAway, yawning, slouching, phoneDetected
}
    ↓
Backend: Return inference to frontend
{
  focusPercent: 72,
  emotion: "focused",
  confidence: 0.85,
  readinessScore: 81
}
    ↓
Frontend: Update sessionStore
    ↓
Frontend: Re-render UI components
```

### 2.4 Session Statistics Calculation

When session ends, backend aggregates:
```javascript
// Calculate statistics from all SessionFocusPoints for this session
{
  averageFocus: mean(focusPercent),
  averageReadiness: mean(readinessScore),
  emotionDistribution: {
    happy: count(emotion === 'happy') / total,
    focused: count(emotion === 'focused') / total,
    // ... etc
  },
  alertCount: count(alertLevel > 0),
  maxAlertLevel: max(alertLevel),
  gesturesCount: {
    lookingAwayCount: count(lookingAway),
    slouchingCount: count(slouching),
    yawningCount: count(yawning)
  }
}
```

### 2.5 Error Handling Strategy

```
Error Hierarchy:
├── BadRequestError (400) - Invalid input
├── UnauthorizedError (401) - Auth required
├── ForbiddenError (403) - No permission
├── NotFoundError (404) - Resource missing
├── ConflictError (409) - Resource conflict
├── ServiceUnavailableError (503) - AI service down
└── InternalServerError (500) - Unknown error

Handler Middleware:
- Catches all errors
- Logs with correlation ID
- Returns standardized response
- Returns heuristic fallback if appropriate (e.g., AI service fails)
```

---

## 3. AI Service Architecture

### 3.1 Endpoint Details

#### POST /focus/predict
```python
Input:
{
  "signals": {
    "lookingAway": bool,
    "yawning": bool,
    "slouching": bool,
    "phoneDetected": bool,
    "elapsedSeconds": int,
    "alertLevel": int,
    "calibrationSeconds": int
  }
}

Output:
{
  "score": 75,  # 0-100
  "modelVersion": "v1.0",
  "schemaVersion": 1
}

Current Implementation: Heuristic
- Start with 90
- -15 if looking away
- -10 if slouching
- -20 if yawning
- -5 if phone detected
- Clamp to 0-100
```

#### POST /emotion/predict
```python
Input: Same signal structure

Output:
{
  "label": "focused",  # happy, neutral, confused, bored, stressed, tired, frustrated
  "confidence": 0.85,
  "modelVersion": "v1.0",
  "schemaVersion": 1
}

Current Implementation: Rule-based
- If phone detected → "bored"
- If yawning + slouching → "tired"
- If multiple distractions → "confused"
- Else → "focused"
```

#### POST /readiness/score
```python
Input: Same signal structure

Output:
{
  "score": 80,  # 0-100
  "modelVersion": "v1.0",
  "schemaVersion": 1
}

Current Implementation: Penalty-based
- Start with 80
- -5 for each distraction detected
- Adjust by elapsed time (better after calibration period)
- Clamp to 0-100
```

### 3.2 Error Handling in AI Service

```python
@app.exception_handler(ValidationError)
def validation_error_handler(exc):
    return {"error": "Invalid input", "details": str(exc)}

@app.exception_handler(Exception)
def general_exception_handler(exc):
    # Log error
    # Return generic response
    return {"error": "Service error", "status": 500}
```

---

## 4. Database Schema

### 4.1 MongoDB Collections

#### users
```javascript
{
  _id: ObjectId,
  email: string (unique),
  name: string,
  hashedPassword: string (bcryptjs),
  profilePhoto: string (URL or base64),
  createdAt: Date,
  updatedAt: Date,
  preferences: { ... } // See userPreferences
}
```

#### userPreferences
```javascript
{
  userId: ObjectId (ref: users),
  theme: string ("light" | "dark" | "system"),
  defaultSessionLength: number (minutes),
  breakInterval: number (minutes),
  alertSensitivity: string ("low" | "medium" | "high"),
  pushNotifications: boolean,
  preSessionReminder: boolean,
  reminderTime: string (HH:MM),
  streakReminder: boolean
}
```

#### studySessions
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  subjectId: ObjectId (ref: subjects),
  topicId: ObjectId (ref: topics),
  topicName: string,
  status: string ("active" | "paused" | "completed"),
  startedAt: Date,
  pausedAt: Date (if paused),
  resumedAt: Date (if resumed),
  endedAt: Date,
  notes: string,
  duration: number (seconds),
  stats: {
    averageFocus: number,
    averageReadiness: number,
    emotionDistribution: { happy, focused, confused, ... },
    alertCount: number,
    maxAlertLevel: number,
    gesturesCount: { lookingAwayCount, slouchingCount, ... }
  }
}
```

#### sessionFocusPoints
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId (ref: studySessions),
  userId: ObjectId (ref: users),
  timestamp: Date,
  focusPercent: number (0-100),
  emotion: string,
  confidence: number (0-1),
  readinessScore: number (0-100),
  alertLevel: number (0-4),
  lookingAway: boolean,
  yawning: boolean,
  slouching: boolean,
  phoneDetected: boolean
}
```

#### subjects
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: string,
  color: string (hex code or CSS color),
  createdAt: Date
}
```

#### topics
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  subjectId: ObjectId (ref: subjects),
  name: string,
  deadline: Date,
  difficulty: number (1-5),
  preparationPercentage: number (0-100),
  estimatedHours: number,
  createdAt: Date
}
```

#### plannerSessions
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  subjectId: ObjectId (ref: subjects),
  topicId: ObjectId (ref: topics),
  recommendedAt: Date,
  scheduledFor: Date,
  duration: number (minutes),
  priority: number (1-5),
  reason: string,
  completed: boolean
}
```

#### reports
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  sessionId: ObjectId (ref: studySessions),
  generatedAt: Date,
  summary: string,
  insights: [string],
  recommendations: [string],
  data: { /* Statistics */ }
}
```

### 4.2 Indexes for Performance

```javascript
// For common queries
db.studySessions.createIndex({ userId: 1, endedAt: -1 });
db.sessionFocusPoints.createIndex({ sessionId: 1, timestamp: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
db.subjects.createIndex({ userId: 1 });
db.topics.createIndex({ userId: 1, subjectId: 1 });
```

---

## 5. Authentication & Security

### 5.1 JWT Flow

```
1. User registers/logs in
2. Backend verifies password (bcryptjs)
3. Backend generates JWT token (exp: 15 min)
4. Backend generates Refresh Token (exp: 7 days, stored in DB)
5. Frontend stores both in localStorage
6. Frontend sends JWT in Authorization header

On JWT Expiry:
1. Frontend detects 401 response
2. Frontend sends Refresh Token to /auth/refresh
3. Backend validates refresh token
4. Backend generates new JWT
5. Frontend retries original request

On Logout:
1. Frontend sends /auth/logout
2. Backend adds Refresh Token to blacklist (Redis with TTL)
3. Frontend clears localStorage
```

### 5.2 Password Security

```
Signup:
1. Password min 8 chars, uppercase, number, special char
2. Hash with bcryptjs (salt rounds: 10)
3. Store hashed password in DB
4. Never store plain password

Login:
1. Retrieve user by email
2. Compare submitted password with hash using bcryptjs
3. If match → generate tokens
4. If no match → return 401
```

### 5.3 CORS Configuration

```
Currently: Permissive (for dev)
Frontend: http://localhost:5173
Backend accepts from: *

For Production:
- Restrict to known domains
- Add Credentials: include
- Add specific allowed headers
```

---

## 6. Real-Time Architecture (Current vs. Planned)

### 6.1 Current (Polling-Based)

```
Frontend Timer (every 3 seconds):
  1. Capture gesture signals
  2. Send HTTP POST to /sessions/:id/events
  3. Wait for response
  4. Update state with scores
  5. Re-render UI

Drawbacks:
- Network overhead (1 request per 3 seconds = 20 req/min per session)
- Latency (round-trip time)
- Doesn't scale to 1000+ concurrent users
```

### 6.2 Planned (WebSocket-Based)

```
Frontend on Session Start:
  1. Establish WebSocket connection: ws://backend/sessions/:id
  2. Authentication with JWT token
  
During Session:
  1. Emit gesture signals via WebSocket
  2. Receive AI predictions in real-time
  3. No polling overhead
  4. Sub-100ms latency possible
  
On Session End:
  1. Close WebSocket connection
  2. Fetch final report via HTTP

Implementation:
- Socket.io or raw WebSocket
- Namespace: /sessions/:sessionId
- Events: connect, gesture, update, disconnect
```

---

## 7. Deployment & Environment Configuration

### 7.1 Environment Variables

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_AI_SERVICE_URL=http://localhost:8000
```

#### Backend (.env)
```
# Server
PORT=3001
NODE_ENV=development

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Database
MONGODB_URI=mongodb://localhost:27017/focusiq
REDIS_URL=redis://localhost:6379

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=5000
```

#### AI Service (.env)
```
DEBUG=true
LOG_LEVEL=DEBUG
ALLOW_CORS=true
```

### 7.2 Docker Compose Services

```yaml
services:
  frontend:
    build: ./frontend
    ports: [5173:5173]
    
  backend:
    build: ./backend
    ports: [3001:3001]
    depends_on: [mongodb, redis]
    
  ai-service:
    build: ./ai-service
    ports: [8000:8000]
    
  mongodb:
    image: mongo:latest
    ports: [27017:27017]
    volumes: [./data/db:/data/db]
    
  redis:
    image: redis:latest
    ports: [6379:6379]
```

---

## 8. Testing Strategy

### 8.1 Frontend Testing

```
Unit Tests:
- Component rendering
- Store state updates
- Hook logic

Integration Tests:
- Page flows (login → planner → session → report)
- API calls and state synchronization
- LocalStorage persistence

E2E Tests:
- Full user journey
- Webcam access simulation
- Session start-to-end

Tools: Jest, React Testing Library, Cypress
```

### 8.2 Backend Testing

```
Unit Tests:
- Model validation
- Service logic
- Middleware

Integration Tests:
- API endpoint responses
- Database operations
- AI service calls

Load Tests:
- Concurrent sessions
- Report generation
- AI inference latency

Tools: Supertest, Jest, k6/Artillery
```

---

## 9. Performance Optimization Tips

### Frontend
- Lazy load pages (React.lazy)
- Memoize components (React.memo)
- Debounce signal uploads
- Compress images (avatar)

### Backend
- Add indexes on userId, sessionId, endedAt
- Cache user preferences in Redis
- Use MongoDB aggregation pipeline for stats
- Implement request-level caching

### AI Service
- Batch inference requests if possible
- Cache model in memory
- Use FastAPI async/await
- Monitor inference latency

---

## 10. Monitoring & Logging

### Logging Format
```
[timestamp] [level] [module] [userId] [correlationId] message

Example:
[2026-05-20 10:30:45] [INFO] [sessions] [user123] [req-abc123] Session started
[2026-05-20 10:30:48] [ERROR] [aiService] [user123] [req-abc123] Focus prediction failed
```

### Key Metrics to Track
- Session event latency (ms)
- AI service response time (ms)
- Database query time (ms)
- Error rate by endpoint
- Focus/emotion prediction accuracy
- User engagement (sessions/day)

---

**Document Version:** 1.0  
**Last Updated:** May 20, 2026

