import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionStore } from "../../stores/sessionStore";
import { useSessionsStore } from "../../stores/sessionsStore";
import { useUserStore } from "../../stores/userStore";
import type { SessionRecord } from "../../types";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatLastStudied(topicName: string, sessions: SessionRecord[]): string {
  const records = sessions
    .filter((session) => (session.topicName || "").toLowerCase() === topicName.toLowerCase())
    .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));

  if (records.length === 0) {
    return "Not yet studied";
  }

  return new Date(records[0].startTime).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ringColor(percent: number): string {
  if (percent >= 70) {
    return "#16A34A";
  }
  if (percent >= 40) {
    return "#F59E0B";
  }
  return "#EF4444";
}

function MiniMeter({ percent, isDarkMode }: { percent: number; isDarkMode: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" role="img" aria-label={`Preparation ${clamped}%`}>
      <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={RADIUS}
        fill="none"
        stroke={ringColor(clamped)}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        style={{ fill: isDarkMode ? "#F3F4F6" : "#374151" }}
        className="text-[10px] font-semibold"
      >
        {clamped}%
      </text>
    </svg>
  );
}

export default function TopicGrid() {
  const navigate = useNavigate();
  const startSession = useSessionStore((state) => state.startSession);
  const records = useSessionsStore((state) => state.records);
  const subjects = usePlannerStore((state) => state.subjects);
  const isDarkMode = useUserStore((state) => state.isDarkMode);

  const cards = useMemo(
    () => {
      const grouped = new Map<
        string,
        {
          topicName: string;
          subjectId: string;
          focus: number[];
        }
      >();

      records.forEach((record) => {
        const normalized = (record.topicName || "").trim();
        if (!normalized) {
          return;
        }
        const key = `${record.subjectId}:${normalized.toLowerCase()}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.focus.push(record.focusPercent);
          return;
        }

        grouped.set(key, {
          topicName: normalized,
          subjectId: record.subjectId,
          focus: [record.focusPercent],
        });
      });

      return Array.from(grouped.values())
        .map((topic) => {
          const avgFocus = Math.round(topic.focus.reduce((sum, value) => sum + value, 0) / topic.focus.length);
          return {
            topic,
            preparationPercent: avgFocus,
            subject: subjects.find((subject) => subject.id === topic.subjectId),
            lastStudied: formatLastStudied(topic.topicName, records),
          };
        })
        .sort((a, b) => b.preparationPercent - a.preparationPercent)
        .slice(0, 8);
    },
    [records, subjects]
  );

  if (cards.length === 0) {
    return <p className="rounded-card bg-white p-4 text-sm text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">No topic insights yet. Complete study sessions to unlock this view.</p>;
  }

  return (
    <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {cards.map(({ topic, subject, lastStudied, preparationPercent }) => (
        <article key={`${topic.subjectId}-${topic.topicName}`} className="flex min-h-[196px] flex-col rounded-card bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject?.color ?? "#9CA3AF" }} />
            <span>{subject?.name ?? "Unknown Subject"}</span>
          </div>

          <h4 className="mt-1 text-[15px] font-bold text-navy dark:text-white">{topic.topicName}</h4>

          <div className="mt-3">
            <MiniMeter percent={preparationPercent} isDarkMode={isDarkMode} />
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-300">
            {lastStudied === "Not yet studied" ? <span className="italic">Not yet studied</span> : `Last studied: ${lastStudied}`}
          </p>

          <button
            type="button"
            onClick={() => {
              void startSession(topic.topicName, subject?.name ?? "Unknown Subject", topic.subjectId);
              navigate("/session");
            }}
            className="mt-auto w-full rounded-btn border border-cyan px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/10"
          >
            Study Now {"->"}
          </button>
        </article>
      ))}
    </section>
  );
}
