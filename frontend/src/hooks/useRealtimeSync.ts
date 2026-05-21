import { useEffect } from "react";
import { getSocket, disconnectSocket } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import { usePlannerStore } from "../stores/plannerStore";
import { useNotificationsStore } from "../stores/notificationsStore";
import { useSessionStore } from "../stores/sessionStore";
import { useSessionsStore } from "../stores/sessionsStore";

export function useRealtimeSync(): void {
  const token = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket(token);

    const handlePlannerChange = (payload?: { userId?: string }) => {
      if (payload?.userId && userId && payload.userId !== userId) {
        return;
      }
      void usePlannerStore.getState().loadPlannerData();
    };

    const handleSessionStart = (payload: { sessionId?: string; status?: string }) => {
      const sessionId = useSessionStore.getState().backendSessionId;
      if (payload?.sessionId && sessionId && payload.sessionId !== sessionId) {
        return;
      }

      void useSessionStore.getState().syncActiveSession();
    };

    const handleSessionUpdate = (payload: {
      sessionId?: string;
      focusPercent?: number;
      readinessScore?: number;
      emotion?: string;
      confidence?: number;
      status?: "active" | "paused" | "completed" | "aborted";
    }) => {
      const sessionId = useSessionStore.getState().backendSessionId;
      if (!payload?.sessionId || !sessionId || payload.sessionId !== sessionId) {
        return;
      }

      if (typeof payload.focusPercent === "number") {
        useSessionStore.getState().updateFocusScore(payload.focusPercent);
      }
      if (typeof payload.readinessScore === "number") {
        useSessionStore.getState().setStudyReadinessScore(payload.readinessScore);
      }
      if (payload.emotion) {
        const allowed = ["happy", "neutral", "confused", "bored", "stressed", "tired", "frustrated"] as const;
        const nextEmotion = allowed.includes(payload.emotion as (typeof allowed)[number])
          ? (payload.emotion as (typeof allowed)[number])
          : "neutral";
        useSessionStore.getState().updateEmotion(nextEmotion, Number(payload.confidence || 0));
      }

      if (payload.status) {
        useSessionStore.setState({
          isPaused: payload.status === "paused",
          isActive: payload.status === "active" || payload.status === "paused",
        });
      }
    };

    const handleSessionEnd = (payload?: { sessionId?: string }) => {
      const sessionId = useSessionStore.getState().backendSessionId;
      if (payload?.sessionId && sessionId && payload.sessionId !== sessionId) {
        return;
      }

      if (payload?.sessionId && sessionId && payload.sessionId === sessionId) {
        useSessionStore.getState().resetSessionState();
      }
      void useSessionsStore.getState().loadRecords();
      void useSessionsStore.getState().loadSummary();
    };

    const handleNotification = (payload: { item?: unknown }) => {
      if (payload?.item && typeof payload.item === "object") {
        useNotificationsStore.getState().addNotification(payload.item as never);
      } else {
        void useNotificationsStore.getState().load();
      }
    };

    socket.on("planner:sessions:changed", handlePlannerChange);
    socket.on("planner:subjects:changed", handlePlannerChange);
    socket.on("session:start", handleSessionStart);
    socket.on("session:update", handleSessionUpdate);
    socket.on("session:end", handleSessionEnd);
    socket.on("notifications:new", handleNotification);

    return () => {
      socket.off("planner:sessions:changed", handlePlannerChange);
      socket.off("planner:subjects:changed", handlePlannerChange);
      socket.off("session:start", handleSessionStart);
      socket.off("session:update", handleSessionUpdate);
      socket.off("session:end", handleSessionEnd);
      socket.off("notifications:new", handleNotification);
      disconnectSocket();
    };
  }, [token, userId]);
}
