import { apiRequest } from "./api";
import type { EmotionLabel } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export type ReportsSessionApi = {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  startTime: string;
  durationMinutes: number;
  focusPercent: number;
  emotionBreakdown: Record<EmotionLabel, number>;
  focusTimeline: number[];
};

export type ReportsSummaryApi = {
  sessionsCount: number;
  avgFocusPercent: number;
  totalMinutes: number;
  bestFocusPercent: number;
  cached: boolean;
};

type ListReportsSessionsResponse = {
  items: ReportsSessionApi[];
};

export function listReportSessions(
  params: {
    range: "7d" | "30d" | "all";
    subjectId: string | "all";
  },
  token: string
) {
  const search = new URLSearchParams();
  search.set("range", params.range);
  if (params.subjectId) {
    search.set("subjectId", params.subjectId);
  }

  return apiRequest<ListReportsSessionsResponse>(`/reports/sessions?${search.toString()}`, {
    token,
  });
}

export function getReportsSummary(
  params: {
    range: "7d" | "30d" | "all";
    subjectId: string | "all";
  },
  token: string
) {
  const search = new URLSearchParams();
  search.set("range", params.range);
  search.set("subjectId", params.subjectId);

  return apiRequest<ReportsSummaryApi>(`/reports/summary?${search.toString()}`, {
    token,
  });
}

export function deleteReportSession(id: string, token: string) {
  return apiRequest<void>(`/reports/sessions/${id}`, {
    method: "DELETE",
    token,
  });
}

export function queueSessionReport(sessionId: string, token: string) {
  return apiRequest<{ queued: boolean; report: { id: string; status: string; attempts: number } }>(`/reports/${sessionId}/generate`, {
    method: "POST",
    token,
  });
}

export function getSessionReportStatus(sessionId: string, token: string) {
  return apiRequest<{
    item: {
      id: string;
      status: "queued" | "processing" | "completed" | "failed" | "dead-letter";
      attempts: number;
      summary: string;
      fileName: string;
      completedAt: string | null;
      lastError: string;
      deadLetterReason: string;
    };
  }>(`/reports/${sessionId}/status`, {
    token,
  });
}

export async function downloadSessionReport(sessionId: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/reports/${sessionId}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Failed to download report";
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      // Ignore JSON parsing errors.
    }
    throw new Error(message);
  }

  return response.blob();
}
