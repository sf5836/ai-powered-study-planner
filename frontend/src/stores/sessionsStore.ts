import { create } from "zustand";
import { ApiError } from "../services/api";
import {
  deleteReportSession,
  downloadSessionReport,
  getSessionReportStatus,
  getReportsSummary,
  listReportSessions,
  queueSessionReport,
} from "../services/reportsService";
import { useAuthStore } from "../store/authStore";
import type { SessionRecord } from "../types";

type SessionsState = {
  records: SessionRecord[];
  summary: {
    sessionsCount: number;
    avgFocusPercent: number;
    totalMinutes: number;
    bestFocusPercent: number;
    cached: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
  loadRecords: (range?: "7d" | "30d" | "all", subjectId?: string | "all") => Promise<void>;
  loadSummary: (range?: "7d" | "30d" | "all", subjectId?: string | "all") => Promise<void>;
  addRecord: (record: SessionRecord) => void;
  deleteRecord: (id: string) => Promise<void>;
  generateAndDownloadReport: (sessionId: string) => Promise<"downloaded" | "queued">;
  clearAll: () => void;
};

type ReportsSessionApi = {
  id: string;
  subjectId: string;
  topicId: string;
  topicName?: string;
  startTime: string;
  durationMinutes: number;
  focusPercent: number;
  emotionBreakdown: SessionRecord["emotionBreakdown"];
  focusTimeline: number[];
};

function mapRecord(item: ReportsSessionApi): SessionRecord {
  return {
    id: item.id,
    subjectId: item.subjectId,
    topicId: item.topicId,
    topicName: item.topicName,
    startTime: new Date(item.startTime),
    durationMinutes: item.durationMinutes,
    focusPercent: item.focusPercent,
    emotionBreakdown: item.emotionBreakdown,
    focusTimeline: item.focusTimeline,
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

export const useSessionsStore = create<SessionsState>((set) => ({
  records: [],
  summary: null,
  isLoading: false,
  error: null,
  loadRecords: async (range = "7d", subjectId = "all") => {
    set({ isLoading: true, error: null });
    try {
      const response = await withAuthToken((token) => listReportSessions({ range, subjectId }, token));
      set({ records: response.items.map(mapRecord), isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load report sessions";
      set({ isLoading: false, error: message });
    }
  },
  loadSummary: async (range = "7d", subjectId = "all") => {
    try {
      const summary = await withAuthToken((token) => getReportsSummary({ range, subjectId }, token));
      set({ summary, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load reports summary";
      set({ error: message });
    }
  },
  addRecord: (record) =>
    set((state) => ({
      records: [record, ...state.records],
    })),
  deleteRecord: async (id) => {
    set({ error: null });
    try {
      await withAuthToken((token) => deleteReportSession(id, token));
      set((state) => ({
        records: state.records.filter((record) => record.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete session";
      set({ error: message });
      throw error;
    }
  },
  generateAndDownloadReport: async (sessionId) => {
    set({ error: null });
    try {
      await withAuthToken((token) => queueSessionReport(sessionId, token));

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await withAuthToken((token) => getSessionReportStatus(sessionId, token));
        if (status.item.status === "completed") {
          const blob = await withAuthToken((token) => downloadSessionReport(sessionId, token));
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = objectUrl;
          anchor.download = status.item.fileName || `report-${sessionId}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(objectUrl);
          return "downloaded";
        }

        if (status.item.status === "dead-letter") {
          throw new Error(status.item.deadLetterReason || "Report generation moved to dead-letter");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return "queued";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate or download report";
      set({ error: message });
      throw error;
    }
  },
  clearAll: () => set({ records: [], summary: null, error: null }),
}));
