import { apiRequest } from "./api";

export type StudySessionApi = {
  _id: string;
  subjectId: string;
  topicId: string | null;
  topicName: string;
  status: "active" | "paused" | "completed" | "aborted";
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  avgFocusPercent: number;
  readinessScore: number;
  notes: string;
};

type SessionResponse = {
  item: StudySessionApi | null;
};

type SessionEventResponse = {
  item: unknown;
  inference: {
    source: string;
    focusPercent: number;
    emotion: string;
    confidence: number;
    readinessScore: number;
  };
};

export function getActiveStudySession(token: string) {
  return apiRequest<SessionResponse>("/sessions/active", { token });
}

export function startStudySession(
  payload: {
    subjectId: string;
    topicId?: string;
    topicName: string;
  },
  token: string
) {
  return apiRequest<SessionResponse>("/sessions/start", {
    method: "POST",
    body: payload,
    token,
  });
}

export function sendStudyEvent(
  id: string,
  payload: {
    secondOffset: number;
    alertLevel: number;
    elapsedSeconds?: number;
    calibrationSeconds?: number;
    lookingAway?: boolean;
    yawning?: boolean;
    slouching?: boolean;
    phoneDetected?: boolean;
  },
  token: string
) {
  return apiRequest<SessionEventResponse>(`/sessions/${id}/events`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function pauseStudySession(id: string, token: string) {
  return apiRequest<SessionResponse>(`/sessions/${id}/pause`, {
    method: "POST",
    token,
  });
}

export function resumeStudySession(id: string, token: string) {
  return apiRequest<SessionResponse>(`/sessions/${id}/resume`, {
    method: "POST",
    token,
  });
}

export function endStudySession(id: string, notes: string, token: string) {
  return apiRequest<SessionResponse>(`/sessions/${id}/end`, {
    method: "POST",
    body: { notes },
    token,
  });
}
