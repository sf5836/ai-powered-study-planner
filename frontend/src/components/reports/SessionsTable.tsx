import { ChevronDown, ChevronUp, FileDown, SearchX, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmModal from "../ui/ConfirmModal";
import type { EmotionLabel, SessionRecord, Subject } from "../../types";

type SortKey = "date" | "subject" | "topic" | "duration" | "focus";
type SortDirection = "asc" | "desc";

type SessionsTableProps = {
  sessions: SessionRecord[];
  subjects: Subject[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
};

const emotionOrder: EmotionLabel[] = ["happy", "neutral", "confused", "bored", "stressed", "tired", "frustrated"];

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortIcon(active: boolean, direction: SortDirection) {
  if (!active) {
    return <ChevronDown size={14} className="opacity-30" />;
  }
  return direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

function focusBadgeClass(score: number): string {
  if (score >= 70) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (score >= 50) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
}

function topEmotions(session: SessionRecord): EmotionLabel[] {
  return [...emotionOrder]
    .sort((left, right) => (session.emotionBreakdown[right] ?? 0) - (session.emotionBreakdown[left] ?? 0))
    .slice(0, 2);
}

export default function SessionsTable({ sessions, subjects, onDelete, onDownload }: SessionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    const copy = [...sessions];
    copy.sort((left, right) => {
      const leftSubject = subjects.find((subject) => subject.id === left.subjectId)?.name ?? "";
      const rightSubject = subjects.find((subject) => subject.id === right.subjectId)?.name ?? "";
      const leftTopic = left.topicName ?? "";
      const rightTopic = right.topicName ?? "";

      let result = 0;

      if (sortKey === "date") {
        result = new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
      } else if (sortKey === "subject") {
        result = leftSubject.localeCompare(rightSubject);
      } else if (sortKey === "topic") {
        result = leftTopic.localeCompare(rightTopic);
      } else if (sortKey === "duration") {
        result = left.durationMinutes - right.durationMinutes;
      } else if (sortKey === "focus") {
        result = left.focusPercent - right.focusPercent;
      }

      return direction === "asc" ? result : -result;
    });

    return copy;
  }, [direction, sessions, sortKey, subjects]);

  const updateSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setDirection(nextKey === "date" ? "desc" : "asc");
  };

  if (sessions.length === 0) {
    return (
      <section className="rounded-card bg-white p-8 shadow-sm dark:bg-gray-800">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <SearchX size={48} className="text-gray-400" />
          <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-100">No sessions found</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Try a different filter</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 dark:bg-gray-700/70 dark:text-gray-200">
              <th className="px-3 py-2">
                <button type="button" onClick={() => updateSort("date")} className="inline-flex items-center gap-1 font-semibold">
                  Date
                  {sortIcon(sortKey === "date", direction)}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => updateSort("subject")} className="inline-flex items-center gap-1 font-semibold">
                  Subject
                  {sortIcon(sortKey === "subject", direction)}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => updateSort("topic")} className="inline-flex items-center gap-1 font-semibold">
                  Topic
                  {sortIcon(sortKey === "topic", direction)}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => updateSort("duration")} className="inline-flex items-center gap-1 font-semibold">
                  Duration
                  {sortIcon(sortKey === "duration", direction)}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => updateSort("focus")} className="inline-flex items-center gap-1 font-semibold">
                  Focus %
                  {sortIcon(sortKey === "focus", direction)}
                </button>
              </th>
              <th className="px-3 py-2 font-semibold">Emotions</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessions.map((session, index) => {
              const subject = subjects.find((entry) => entry.id === session.subjectId);
              const topTwo = topEmotions(session);

              return (
                <tr
                  key={session.id}
                  className={[
                    "transition",
                    index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : "",
                    "hover:bg-blue-50 dark:hover:bg-gray-700/30",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {new Date(session.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject?.color ?? "#9CA3AF" }} />
                      {subject?.name ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{session.topicName || "Unknown Topic"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{session.durationMinutes} min</td>
                  <td className="px-3 py-2">
                    <span className={["rounded-full px-2 py-1 text-xs font-semibold", focusBadgeClass(session.focusPercent)].join(" ")}>
                      {Math.round(session.focusPercent)}%
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {topTwo.map((emotion) => (
                        <span key={emotion} className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600 dark:border-gray-600 dark:text-gray-200">
                          {sentenceCase(emotion)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDownload(session.id);
                        }}
                        className="rounded-btn border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        aria-label="Export as PDF"
                      >
                        <FileDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(session.id)}
                        className="rounded-btn border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-700/50 dark:text-red-300 dark:hover:bg-red-900/20"
                        aria-label="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        title="Delete this session record?"
        description="This action removes the session from your reports history."
        confirmLabel="Delete Record"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingDeleteId) {
            onDelete(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
      />
    </section>
  );
}
