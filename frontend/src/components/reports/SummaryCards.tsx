import { Clock3, Target, Trophy } from "lucide-react";
import type { SessionRecord, Subject } from "../../types";

type SummaryCardsProps = {
  sessions: SessionRecord[];
  subjects: Subject[];
  summary?: {
    sessionsCount: number;
    avgFocusPercent: number;
    totalMinutes: number;
    bestFocusPercent: number;
    cached: boolean;
  } | null;
};

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function focusTone(score: number): string {
  if (score >= 70) {
    return "text-emerald-500";
  }
  if (score >= 40) {
    return "text-amber-500";
  }
  return "text-red-500";
}

function formatTrend(current: number, previous: number): string {
  const delta = Math.round((current - previous) * 10) / 10;
  if (previous === 0 && current === 0) {
    return "No change vs previous period";
  }
  if (previous === 0) {
    return `+${delta}% vs previous period`;
  }
  return `${delta >= 0 ? "+" : ""}${delta}% vs previous period`;
}

export default function SummaryCards({ sessions, subjects, summary }: SummaryCardsProps) {
  const sorted = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const avgFocus =
    summary && summary.sessionsCount > 0
      ? summary.avgFocusPercent
      : sorted.length > 0
        ? sorted.reduce((sum, session) => sum + session.focusPercent, 0) / sorted.length
        : 0;

  const split = Math.ceil(sorted.length / 2);
  const previousSlice = sorted.slice(0, Math.max(0, sorted.length - split));
  const currentSlice = sorted.slice(Math.max(0, sorted.length - split));
  const previousAvg = previousSlice.length > 0 ? previousSlice.reduce((sum, session) => sum + session.focusPercent, 0) / previousSlice.length : 0;
  const currentAvg = currentSlice.length > 0 ? currentSlice.reduce((sum, session) => sum + session.focusPercent, 0) / currentSlice.length : 0;

  const totalMinutes = summary ? summary.totalMinutes : sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const bestSession = [...sessions].sort((a, b) => b.focusPercent - a.focusPercent)[0] ?? null;
  const bestSubject = bestSession ? subjects.find((subject) => subject.id === bestSession.subjectId) : null;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Target size={16} className="text-cyan" />
          <span>Avg Focus Score</span>
        </div>
        <p className={`text-3xl font-bold ${focusTone(avgFocus)}`}>{Math.round(avgFocus)}%</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">{formatTrend(currentAvg, previousAvg)}</p>
      </article>

      <article className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Clock3 size={16} className="text-purple" />
          <span>Total Study Time</span>
        </div>
        <p className="text-3xl font-bold text-navy dark:text-white">{formatHours(totalMinutes)}</p>
      </article>

      <article className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Trophy size={16} className="text-amber-500" />
          <span>Best Session</span>
        </div>
        <p className={`text-3xl font-bold ${bestSession || summary?.bestFocusPercent ? focusTone(bestSession?.focusPercent ?? summary?.bestFocusPercent ?? 0) : "text-gray-400"}`}>
          {bestSession || summary?.bestFocusPercent ? `${Math.round(bestSession?.focusPercent ?? summary?.bestFocusPercent ?? 0)}%` : "--%"}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
          {bestSession ? `${bestSubject?.name ?? "Unknown Subject"} · ${bestSession.topicName || "Unknown Topic"}` : "No sessions yet"}
        </p>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-400">
          {bestSession ? new Date(bestSession.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
        </p>
        {summary?.cached && <p className="mt-1 text-[11px] text-cyan">Served from cache</p>}
      </article>
    </section>
  );
}
