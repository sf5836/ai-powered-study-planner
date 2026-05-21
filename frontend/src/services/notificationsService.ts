import { apiRequest } from "./api";

export type NotificationItem = {
  id: string;
  type: "pre_session" | "streak" | "deadline" | "system";
  title: string;
  message: string;
  status: "pending" | "sent" | "read" | "dismissed";
  createdAt: string;
  readAt?: string | null;
  scheduledFor?: string | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
};

type NotificationResponse = {
  item: NotificationItem;
};

export function listNotifications(token: string, status: "all" | "pending" | "sent" | "read" | "dismissed" = "all") {
  const query = status === "all" ? "" : `?status=${status}`;
  return apiRequest<NotificationsResponse>(`/notifications${query}`, { token });
}

export function updateNotificationStatus(token: string, id: string, status: "pending" | "sent" | "read" | "dismissed") {
  return apiRequest<NotificationResponse>(`/notifications/${id}`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

export function deleteNotification(token: string, id: string) {
  return apiRequest<void>(`/notifications/${id}`, {
    method: "DELETE",
    token,
  });
}

export function createNotification(
  token: string,
  payload: {
    type?: "pre_session" | "streak" | "deadline" | "system";
    title: string;
    message: string;
    scheduledFor?: string;
  }
) {
  return apiRequest<NotificationResponse>("/notifications", {
    method: "POST",
    body: payload,
    token,
  });
}
