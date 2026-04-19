import { create } from "zustand";
import { ApiError } from "../services/api";
import {
  createPlannerSession,
  createSubject,
  deletePlannerSession,
  deleteSubject,
  generatePlanner,
  listPlannerSessions,
  listSubjects,
  type PlannerSessionApi,
  type SubjectApi,
  updatePlannerSession,
  updateSubject,
} from "../services/plannerService";
import { useAuthStore } from "../store/authStore";
import type { PlannerSession, Subject } from "../types";

let loadPlannerDataInFlight: Promise<void> | null = null;

type PlannerStore = {
  sessions: PlannerSession[];
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;
  loadPlannerData: () => Promise<void>;
  addSession: (session: Omit<PlannerSession, "id">) => Promise<void>;
  generateWeeklyPlan: (options?: { availableMinutesPerDay?: number }) => Promise<number>;
  updateSession: (id: string, updates: Partial<PlannerSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addSubject: (subject: Omit<Subject, "id">) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
};

function mapSubject(apiSubject: SubjectApi): Subject {
  return {
    id: apiSubject._id,
    name: apiSubject.name,
    color: apiSubject.color,
  };
}

function mapSession(apiSession: PlannerSessionApi): PlannerSession {
  return {
    id: apiSession._id,
    subjectId: apiSession.subjectId,
    topicName: apiSession.topicName,
    date: new Date(apiSession.date),
    startHour: apiSession.startHour,
    durationMinutes: apiSession.durationMinutes,
    notes: apiSession.notes,
  };
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

export const usePlannerStore = create<PlannerStore>((set) => ({
  sessions: [],
  subjects: [],
  isLoading: false,
  error: null,
  loadPlannerData: async () => {
    if (loadPlannerDataInFlight) {
      return loadPlannerDataInFlight;
    }

    set({ isLoading: true, error: null });
    loadPlannerDataInFlight = (async () => {
      try {
        const [subjectsResponse, sessionsResponse] = await withAuthToken((token) =>
          Promise.all([listSubjects(token), listPlannerSessions(token)])
        );

        set({
          subjects: subjectsResponse.items.map(mapSubject),
          sessions: sessionsResponse.items.map(mapSession),
          isLoading: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load planner data";
        set({ isLoading: false, error: message });
      }
    })();

    try {
      await loadPlannerDataInFlight;
    } finally {
      loadPlannerDataInFlight = null;
    }
  },
  addSession: async (session) => {
    set({ error: null });
    try {
      const response = await withAuthToken((token) =>
        createPlannerSession(
          {
            subjectId: session.subjectId,
            topicName: session.topicName,
            date: session.date.toISOString(),
            startHour: session.startHour,
            durationMinutes: session.durationMinutes,
            notes: session.notes,
          },
          token
        )
      );

      set((state) => ({ sessions: [...state.sessions, mapSession(response.item)] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add session";
      set({ error: message });
      throw error;
    }
  },
  generateWeeklyPlan: async (options) => {
    set({ isLoading: true, error: null });
    try {
      const response = await withAuthToken((token) =>
        generatePlanner(
          {
            availableMinutesPerDay: options?.availableMinutesPerDay ?? 120,
          },
          token
        )
      );

      set((state) => ({
        sessions: [...state.sessions, ...response.items.map(mapSession)],
        isLoading: false,
      }));

      return response.count;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate weekly plan";
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  updateSession: async (id, updates) => {
    set({ error: null });
    try {
      const payload: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(updates, "subjectId")) payload.subjectId = updates.subjectId;
      if (Object.prototype.hasOwnProperty.call(updates, "topicName")) payload.topicName = updates.topicName;
      if (Object.prototype.hasOwnProperty.call(updates, "date") && updates.date) payload.date = updates.date.toISOString();
      if (Object.prototype.hasOwnProperty.call(updates, "startHour")) payload.startHour = updates.startHour;
      if (Object.prototype.hasOwnProperty.call(updates, "durationMinutes")) payload.durationMinutes = updates.durationMinutes;
      if (Object.prototype.hasOwnProperty.call(updates, "notes")) payload.notes = updates.notes;

      const response = await withAuthToken((token) => updatePlannerSession(id, payload, token));
      const updated = mapSession(response.item);

      set((state) => ({
        sessions: state.sessions.map((session) => (session.id === id ? updated : session)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update session";
      set({ error: message });
      throw error;
    }
  },
  deleteSession: async (id) => {
    set({ error: null });
    try {
      await withAuthToken((token) => deletePlannerSession(id, token));
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete session";
      set({ error: message });
      throw error;
    }
  },
  addSubject: async (subject) => {
    set({ error: null });
    try {
      const response = await withAuthToken((token) => createSubject(subject, token));
      set((state) => ({
        subjects: [...state.subjects, mapSubject(response.item)],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add subject";
      set({ error: message });
      throw error;
    }
  },
  updateSubject: async (id, updates) => {
    set({ error: null });
    try {
      const response = await withAuthToken((token) => updateSubject(id, updates, token));
      const updated = mapSubject(response.item);
      set((state) => ({
        subjects: state.subjects.map((subject) => (subject.id === id ? updated : subject)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update subject";
      set({ error: message });
      throw error;
    }
  },
  deleteSubject: async (id) => {
    set({ error: null });
    try {
      await withAuthToken((token) => deleteSubject(id, token));
      set((state) => ({
        subjects: state.subjects.filter((subject) => subject.id !== id),
        sessions: state.sessions.filter((session) => session.subjectId !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete subject";
      set({ error: message });
      throw error;
    }
  },
}));
