import { Link } from "react-router-dom";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionsStore } from "../../stores/sessionsStore";
import type { EmotionLabel } from "../../types";
import FocusSparkline from "../ui/FocusSparkline";

const emotionPillClass: Record<EmotionLabel, string> = {
  happy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  confused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  bored: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200",
  stressed: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  tired: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
  frustrated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
};

function getFocusColor(focus: number): string {
  if (focus < 40) {
    return "text-red-500";
  }
  if (focus < 70) {
    return "text-amber-500";
  }
  return "text-[#1B8A4C]";
}

export default function LastSessionCard() {
  const records = useSessionsStore((state) => state.records);
  const subjects = usePlannerStore((state) => state.subjects);

  const lastSession = [...records].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0];

  if (!lastSession) {
    return null;
  }

  const subject = subjects.find((entry) => entry.id === lastSession.subjectId);

  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-300">Last Session</p>
        <Link
          to="/reports"
          className="text-sm font-medium text-cyan transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          View Full Report →
        </Link>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject?.color ?? "#6B7280" }} />
            <p className="truncate text-sm text-gray-600 dark:text-gray-300">{subject?.name ?? "Unknown Subject"}</p>
          </div>
          <p className="mt-1 truncate text-base font-semibold text-navy dark:text-white">{lastSession.topicName || "Unknown Topic"}</p>
        </div>

        <p className={`text-3xl font-bold ${getFocusColor(lastSession.focusPercent)}`}>{lastSession.focusPercent}%</p>

        <div className="shrink-0">
          <FocusSparkline data={lastSession.focusTimeline} width={80} height={32} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(lastSession.emotionBreakdown) as EmotionLabel[]).map((emotion) => (
          <span
            key={emotion}
            className={`rounded-full px-2 py-1 text-[11px] font-medium ${emotionPillClass[emotion]}`}
          >
            {emotion} {lastSession.emotionBreakdown[emotion]}%
          </span>
        ))}
      </div>
    </section>
  );
}
