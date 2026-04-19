import { BookMarked } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlannerStore } from "../../stores/plannerStore";

function dayDiff(deadline: Date, today: Date): number {
  const left = new Date(deadline);
  left.setHours(0, 0, 0, 0);
  const right = new Date(today);
  right.setHours(0, 0, 0, 0);
  return Math.ceil((left.getTime() - right.getTime()) / 86400000);
}

function badge(dayDelta: number, deadline: Date): { text: string; className: string } {
  if (dayDelta <= 0) {
    return { text: "Today!", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200" };
  }
  if (dayDelta < 2) {
    return { text: "Tomorrow", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200" };
  }
  if (dayDelta < 7) {
    return { text: `${dayDelta} days`, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" };
  }

  return {
    text: deadline.toLocaleDateString([], { month: "short", day: "numeric" }),
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
  };
}

export default function UpcomingDeadlines() {
  const subjects = usePlannerStore((state) => state.subjects);
  const plannerSessions = usePlannerStore((state) => state.sessions);

  const today = new Date();
  const list = [...plannerSessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
    .map((session) => {
      const subject = subjects.find((entry) => entry.id === session.subjectId);
      const delta = dayDiff(new Date(session.date), today);
      return {
        session,
        subject,
        ...badge(delta, new Date(session.date)),
      };
    });

  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
      <header className="mb-4 flex items-center gap-2">
        <BookMarked size={18} className="text-cyan" />
        <h3 className="font-display text-xl text-navy dark:text-white">Upcoming Deadlines</h3>
      </header>

      <div className="space-y-3">
        {list.map(({ session, subject, text, className }) => (
          <article key={session.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color ?? "#9CA3AF" }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy dark:text-white">{session.topicName}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-300">{subject?.name ?? "Unknown"}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{text}</span>
          </article>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-300">No upcoming planned sessions</p>}
      </div>

      <Link
        to="/planner"
        className="mt-4 inline-flex text-sm font-medium text-cyan transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        View all in Planner →
      </Link>
    </section>
  );
}
