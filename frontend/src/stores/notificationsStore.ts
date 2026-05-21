import { create } from "zustand";
import { ApiError } from "../services/api";
import {
  listNotifications,
  type NotificationItem,
  updateNotificationStatus,
  deleteNotification,
} from "../services/notificationsService";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "./userStore";

export type NotificationsState = {
  items: NotificationItem[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
  unreadCount: () => number;
};

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

function maybeShowBrowserNotification(item: NotificationItem) {
  const pushEnabled = useUserStore.getState().pushNotifications;
  if (!pushEnabled || typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(item.title, { body: item.message });
  }
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await withAuthToken((token) => listNotifications(token));
      set({ items: response.items, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notifications";
      set({ isLoading: false, error: message });
    }
  },
  markRead: async (id) => {
    try {
      const response = await withAuthToken((token) => updateNotificationStatus(token, id, "read"));
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? response.item : item)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update notification";
      set({ error: message });
    }
  },
  dismiss: async (id) => {
    try {
      await withAuthToken((token) => deleteNotification(token, id));
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete notification";
      set({ error: message });
    }
  },
  addNotification: (notification) => {
    set((state) => ({
      items: [notification, ...state.items].slice(0, 50),
    }));
    maybeShowBrowserNotification(notification);
  },
  unreadCount: () => get().items.filter((item) => item.status !== "read" && item.status !== "dismissed").length,
}));
