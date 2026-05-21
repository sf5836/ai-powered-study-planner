# AI Services Overview

## Why We Use AI
This project uses lightweight AI to infer student focus, emotional state, and readiness from session signals. The goal is to provide helpful, real-time feedback and post-session insights without requiring heavy compute or private data storage.

## Services and Responsibilities

### AI Service (FastAPI, Python)
- Location: ai-service/
- Purpose: Central service that computes focus, readiness, emotion summaries, and report insights.
- Why: Keeps AI logic isolated from the Node backend and allows independent scaling and iteration.

### Focus Scoring
- Inputs: Session attention signals, gesture flags, and timing.
- Output: A focus score and focus category.
- Why: Gives users a simple, actionable metric of attention quality.

### Readiness Scoring
- Inputs: Session activity pattern, break behavior, and fatigue signals.
- Output: A readiness score and readiness category.
- Why: Helps users understand if their study session was sustainable and effective.

### Emotion Inference
- Inputs: Aggregate signals and heuristics from the session.
- Output: An emotion distribution summary and dominant emotion.
- Why: Adds context to focus changes and helps interpret behavior changes.

### Report Synthesis
- Inputs: Focus, readiness, emotion summaries, and session metadata.
- Output: A report payload for the backend to store and show in UI.
- Why: Consolidates insights for history and analytics.

## AI Execution Flow
1. Frontend captures session signals.
2. Backend posts session data to the AI service.
3. AI service returns focus/readiness/emotion outputs.
4. Backend stores the results and the frontend displays them.

## Notes
- The AI service uses heuristic scoring rather than large models to keep latency and costs low.
- All processing happens on backend infrastructure; no raw video is stored.
