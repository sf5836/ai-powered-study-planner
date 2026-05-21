import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationsStore } from "../../stores/notificationsStore";

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type NotificationsPanelProps = {
  onClose: () => void;
};

export default function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { items, isLoading, error, load, markRead, dismiss } = useNotificationsStore();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="absolute right-0 top-11 z-50 w-[280px] rounded-card border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-300">Notifications</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/reports");
          }}
          className="text-xs font-semibold text-cyan"
        >
          View all
        </button>
      </div>

      {isLoading && <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-300">Loading…</p>}
      {error && <p className="px-2 py-2 text-xs text-red-500">{error}</p>}

      {!isLoading && items.length === 0 && (
        <p className="px-2 py-3 text-xs text-gray-500 dark:text-gray-300">No notifications yet.</p>
      )}

      <div className="max-h-[280px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="rounded-btn px-2 py-2 hover:bg-gray-100 dark:hover:bg-white/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-100">{item.title}</p>
              <span className="text-[10px] text-gray-400">{formatTime(item.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.message}</p>
            <div className="mt-2 flex items-center gap-2">
              {item.status !== "read" && (
                <button
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className="text-xs font-semibold text-cyan"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => void dismiss(item.id)}
                className="text-xs font-semibold text-gray-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
