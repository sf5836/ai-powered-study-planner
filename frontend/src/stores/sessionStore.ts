import { create } from "zustand";
import { ApiError } from "../services/api";
import {
  endStudySession,
  getActiveStudySession,
  pauseStudySession,
  resumeStudySession,
  sendStudyEvent,
  startStudySession,
} from "../services/sessionService";
import { useAuthStore } from "../store/authStore";
import type { EmotionEvent, EmotionLabel } from "../types";
import { usePlannerStore } from "./plannerStore";
import { useSessionsStore } from "./sessionsStore";

export type GestureFlags = {
  lookingAway: boolean;
  yawning: boolean;
  slouching: boolean;
  phoneDetected: boolean;
};

export type SessionState = {
  backendSessionId: string | null;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  elapsedSeconds: number;
  currentSubject: string;
  currentTopic: string;
  focusScore: number;
  studyReadinessScore: number;
  currentEmotion: EmotionLabel;
  alertLevel: 0 | 1 | 2 | 3 | 4;
  gestureFlags: GestureFlags;
  gestureAvailable: boolean;
  focusHistory: number[];
  emotionHistory: EmotionEvent[];
  sessionNotes: string;
  calibrationSeconds: number;
  startSession: (topic: string, subject: string, subjectId?: string, topicId?: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: () => Promise<void>;
  syncActiveSession: () => Promise<void>;
  pushEvent: () => Promise<void>;
  setAlertLevel: (level: 0 | 1 | 2 | 3 | 4) => void;
  updateFocusScore: (score: number) => void;
  updateEmotion: (emotion: EmotionLabel, confidence: number) => void;
  updateGestureFlags: (flags: Partial<GestureFlags>) => void;
  setGestureAvailable: (available: boolean) => void;
  appendNote: (text: string) => void;
  setElapsedSeconds: (seconds: number) => void;
  setCalibrationSeconds: (seconds: number) => void;
  setStudyReadinessScore: (score: number) => void;
  setCurrentSession: (subject: string, topic: string) => void;
  resetSessionState: () => void;
};

const defaultGestures: GestureFlags = {
  lookingAway: false,
  yawning: false,
  slouching: false,
  phoneDetected: false,
};

function getDefaultSessionState(backendSessionId: string | null) {
  return {
    backendSessionId,
    isActive: false,
    isPaused: false,
    startTime: null,
    elapsedSeconds: 0,
    currentSubject: "",
    currentTopic: "",
    focusScore: 70,
    studyReadinessScore: 0,
    currentEmotion: "neutral" as EmotionLabel,
    alertLevel: 0 as const,
    gestureFlags: defaultGestures,
    gestureAvailable: false,
    focusHistory: [] as number[],
    emotionHistory: [] as EmotionEvent[],
    sessionNotes: "",
    calibrationSeconds: 0,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function seededReadiness(): number {
  return Math.floor(45 + Math.random() * 45);
}

function computeElapsedSeconds(active: { startedAt?: string; totalPausedSeconds?: number; status?: string; pausedAt?: string | null }): number {
  if (!active?.startedAt) {
    return 0;
  }

  const startedAtMs = new Date(active.startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return 0;
  }

  const nowMs = Date.now();
  const totalPausedSeconds = Math.max(0, Number(active.totalPausedSeconds || 0));
  let pausedSeconds = 0;

  if (active.status === "paused" && active.pausedAt) {
    const pausedAtMs = new Date(active.pausedAt).getTime();
    if (!Number.isNaN(pausedAtMs)) {
      pausedSeconds = Math.max(0, Math.round((nowMs - pausedAtMs) / 1000));
    }
  }

  const elapsed = Math.round((nowMs - startedAtMs) / 1000) - totalPausedSeconds - pausedSeconds;
  return Math.max(0, elapsed);
}

async function withAuthToken<T>(operation: (token: string) => Promise<T>): Promise<T> {
  const auth = useAuthStore.getState();
  let token = auth.accessToken;

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    return await operation(token);
  } catch (error) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    if (!isUnauthorized) {
      throw error;
    }

    const refreshed = await auth.refreshSession();
    if (!refreshed) {
      throw error;
    }

    token = useAuthStore.getState().accessToken;
    if (!token) {
      throw error;
    }

    return operation(token);
  }
}

function persistBackendSessionId(id: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!id) {
    window.localStorage.removeItem("focusiq_active_session_id");
    return;
  }
  window.localStorage.setItem("focusiq_active_session_id", id);
}

function readPersistedBackendSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("focusiq_active_session_id");
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...getDefaultSessionState(readPersistedBackendSessionId()),
  startSession: async (topic, subject, subjectId, topicId) => {
    let resolvedSubjectId = subjectId;

    if (!resolvedSubjectId) {
      const plannerSubjects = usePlannerStore.getState().subjects;
      const matchByName = plannerSubjects.find((entry) => entry.name.toLowerCase() === subject.toLowerCase());
      resolvedSubjectId = matchByName?.id;
    }

    if (!resolvedSubjectId) {
      throw new Error("Unable to resolve subject for session start");
    }

    let response;
    try {
      response = await withAuthToken((token) =>
        startStudySession(
          {
            subjectId: resolvedSubjectId,
            topicId,
            topicName: topic,
          },
          token
        )
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await get().syncActiveSession();
        return;
      }
      throw error;
    }

    const backendSessionId = response.item?._id ?? null;
    persistBackendSessionId(backendSessionId);

    set({
      backendSessionId,
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      elapsedSeconds: 0,
      currentTopic: topic,
      currentSubject: subject,
      focusScore: 70,
      studyReadinessScore: seededReadiness(),
      currentEmotion: "neutral",
      alertLevel: 0,
      gestureFlags: defaultGestures,
      focusHistory: [],
      emotionHistory: [],
      sessionNotes: "",
      calibrationSeconds: 0,
    });
  },
  pauseSession: async () => {
    const state = get();
    if (state.backendSessionId) {
      await withAuthToken((token) => pauseStudySession(state.backendSessionId as string, token));
    }
    set({ isPaused: true });
  },
  resumeSession: async () => {
    const state = get();
    if (state.backendSessionId) {
      await withAuthToken((token) => resumeStudySession(state.backendSessionId as string, token));
    }
    set({ isPaused: false });
  },
  endSession: async () => {
    const state = get();

    if (state.backendSessionId) {
      await withAuthToken((token) => endStudySession(state.backendSessionId as string, state.sessionNotes, token));
    }

    void useSessionsStore.getState().loadRecords();

    get().resetSessionState();
  },
  syncActiveSession: async () => {
    const response = await withAuthToken((token) => getActiveStudySession(token));
    const active = response.item;
    if (!active) {
      get().resetSessionState();
      return;
    }

    if (usePlannerStore.getState().subjects.length === 0) {
      try {
        await usePlannerStore.getState().loadPlannerData();
      } catch {
        // Keep going if planner data fails to load.
      }
    }

    const subjects = usePlannerStore.getState().subjects;
    const subjectName = subjects.find((entry) => entry.id === active.subjectId)?.name || "";
    const nextElapsedSeconds = computeElapsedSeconds(active);
    const state = get();
    const isSameSession = state.backendSessionId === active._id;

    persistBackendSessionId(active._id);
    set((current) => ({
      backendSessionId: active._id,
      isActive: true,
      isPaused: active.status === "paused",
      startTime: current.startTime ?? new Date(active.startedAt),
      elapsedSeconds: isSameSession ? current.elapsedSeconds : nextElapsedSeconds,
      currentTopic: current.currentTopic || active.topicName,
      currentSubject: current.currentSubject || subjectName,
      ...(isSameSession
        ? {}
        : {
            focusScore: 70,
            studyReadinessScore: 0,
            currentEmotion: "neutral",
            alertLevel: 0,
            gestureFlags: defaultGestures,
            gestureAvailable: current.gestureAvailable,
            focusHistory: [],
            emotionHistory: [],
            sessionNotes: "",
            calibrationSeconds: 0,
          }),
    }));
  },
  pushEvent: async () => {
    const state = get();
    if (!state.backendSessionId || !state.isActive) {
      return;
    }

    const response = await withAuthToken((token) =>
      sendStudyEvent(
        state.backendSessionId as string,
        {
          secondOffset: state.elapsedSeconds,
          elapsedSeconds: state.elapsedSeconds,
          alertLevel: Math.min(3, state.alertLevel),
          calibrationSeconds: state.calibrationSeconds,
          lookingAway: state.gestureFlags.lookingAway,
          yawning: state.gestureFlags.yawning,
          slouching: state.gestureFlags.slouching,
          phoneDetected: state.gestureFlags.phoneDetected,
        },
        token
      )
    );

    const inference = response.inference;
    const nextEmotion = (inference.emotion || "neutral") as EmotionLabel;

    set((current) => ({
      focusScore: clampScore(inference.focusPercent),
      studyReadinessScore: clampScore(inference.readinessScore),
      currentEmotion: nextEmotion,
      focusHistory: [...current.focusHistory, clampScore(inference.focusPercent)].slice(-60),
      emotionHistory: [
        ...current.emotionHistory,
        {
          timestamp: current.elapsedSeconds,
          emotion: nextEmotion,
          confidence: Number(inference.confidence || 0),
        },
      ].slice(-120),
    }));
  },
  setAlertLevel: (level) => set({ alertLevel: level }),
  updateFocusScore: (score) => {
    const clamped = clampScore(score);
    set((state) => ({
      focusScore: clamped,
      focusHistory: [...state.focusHistory, clamped].slice(-60),
    }));
  },
  updateEmotion: (emotion, confidence) => {
    set((state) => ({
      currentEmotion: emotion,
      emotionHistory: [...state.emotionHistory, { timestamp: state.elapsedSeconds, emotion, confidence }].slice(-120),
    }));
  },
  updateGestureFlags: (flags) =>
    set((state) => ({
      gestureFlags: {
        ...state.gestureFlags,
        ...flags,
      },
    })),
  setGestureAvailable: (available) => set({ gestureAvailable: available }),
  appendNote: (text) => set({ sessionNotes: text }),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: Math.max(0, seconds) }),
  setCalibrationSeconds: (seconds) => set({ calibrationSeconds: Math.max(0, Math.min(30, seconds)) }),
  setStudyReadinessScore: (score) => set({ studyReadinessScore: clampScore(score) }),
  setCurrentSession: (subject, topic) =>
    set({
      currentSubject: subject,
      currentTopic: topic,
    }),
  resetSessionState: () => {
    persistBackendSessionId(null);
    set(getDefaultSessionState(null));
  },
}));
