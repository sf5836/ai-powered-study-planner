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
  appendNote: (text: string) => void;
  setElapsedSeconds: (seconds: number) => void;
  setCalibrationSeconds: (seconds: number) => void;
  setStudyReadinessScore: (score: number) => void;
  setCurrentSession: (subject: string, topic: string) => void;
};

const defaultGestures: GestureFlags = {
  lookingAway: false,
  yawning: false,
  slouching: false,
  phoneDetected: false,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function seededReadiness(): number {
  return Math.floor(45 + Math.random() * 45);
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
  backendSessionId: readPersistedBackendSessionId(),
  isActive: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,
  currentSubject: "",
  currentTopic: "",
  focusScore: 70,
  studyReadinessScore: 0,
  currentEmotion: "neutral",
  alertLevel: 0,
  gestureFlags: defaultGestures,
  focusHistory: [],
  emotionHistory: [],
  sessionNotes: "",
  calibrationSeconds: 0,
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

    const response = await withAuthToken((token) =>
      startStudySession(
        {
          subjectId: resolvedSubjectId,
          topicId,
          topicName: topic,
        },
        token
      )
    );

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

    persistBackendSessionId(null);

    set({
      backendSessionId: null,
      isActive: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentSubject: "",
      currentTopic: "",
      focusScore: 70,
      studyReadinessScore: 0,
      currentEmotion: "neutral",
      alertLevel: 0,
      gestureFlags: defaultGestures,
      focusHistory: [],
      emotionHistory: [],
      sessionNotes: "",
      calibrationSeconds: 0,
    });
  },
  syncActiveSession: async () => {
    const response = await withAuthToken((token) => getActiveStudySession(token));
    const active = response.item;
    if (!active) {
      persistBackendSessionId(null);
      return;
    }

    persistBackendSessionId(active._id);
    set((state) => ({
      backendSessionId: active._id,
      isActive: true,
      isPaused: active.status === "paused",
      startTime: state.startTime ?? new Date(active.startedAt),
      currentTopic: state.currentTopic || active.topicName,
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
  appendNote: (text) => set({ sessionNotes: text }),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: Math.max(0, seconds) }),
  setCalibrationSeconds: (seconds) => set({ calibrationSeconds: Math.max(0, Math.min(30, seconds)) }),
  setStudyReadinessScore: (score) => set({ studyReadinessScore: clampScore(score) }),
  setCurrentSession: (subject, topic) =>
    set({
      currentSubject: subject,
      currentTopic: topic,
    }),
}));
