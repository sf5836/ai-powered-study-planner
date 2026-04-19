import { Link } from "react-router-dom";
import { usePlannerStore } from "../../stores/plannerStore";

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatTime(date: Date, hour: number): string {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function TodayScheduleStrip() {
  const plannerSessions = usePlannerStore((state) => state.sessions);
  const subjects = usePlannerStore((state) => state.subjects);
  const today = new Date();
  const todayItems = plannerSessions.filter((session) => isSameDay(new Date(session.date), today));

  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl text-navy dark:text-white">Today's Schedule</h3>
      </div>

      {todayItems.length === 0 ? (
        <div className="flex items-center justify-between rounded-btn bg-gray-50 p-3 text-sm text-gray-500 dark:bg-white/5 dark:text-gray-300">
          <span>No sessions planned today</span>
          <Link
            to="/planner"
            className="rounded-btn border border-cyan/40 px-2 py-1 text-cyan transition hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          >
            +
          </Link>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {todayItems.map((item) => {
            const subject = subjects.find((entry) => entry.id === item.subjectId);
            const subjectColor = subject?.color ?? "#6B7280";

            return (
              <article
                key={item.id}
                className="min-w-[160px] rounded-card border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-10 w-[3px] rounded-full" style={{ backgroundColor: subjectColor }} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy dark:text-white">{item.topicName}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-300">{formatTime(new Date(item.date), item.startHour)}</p>
                    <span
                      className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: `${subjectColor}26`, color: subjectColor }}
                    >
                      {item.durationMinutes} min
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
