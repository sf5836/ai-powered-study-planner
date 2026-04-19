import * as Tooltip from "@radix-ui/react-tooltip";
import { Plus, SquarePen } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionStore } from "../../stores/sessionStore";
import type { PlannerSession } from "../../types";
import EditSessionModal from "./EditSessionModal";

const START_HOUR = 6;
const ROWS = 17;

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatHour(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace(/\./g, "")
    .toLowerCase();
}

function formatTimeRange(startHour: number, durationMinutes: number): string {
  const start = new Date();
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const format = (value: Date) =>
    value
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      .replace(/\./g, "")
      .toLowerCase();

  return `${format(start)} - ${format(end)}`;
}

export default function CalendarGrid() {
  const navigate = useNavigate();
  const { sessions, subjects, addSession } = usePlannerStore(
    useShallow((state) => ({
      sessions: state.sessions,
      subjects: state.subjects,
      addSession: state.addSession,
    }))
  );
  const startSession = useSessionStore((state) => state.startSession);

  const [editingSession, setEditingSession] = useState<PlannerSession | null>(null);

  const dayLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
      }),
    []
  );

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(day.getDate() + index);
      return day;
    }),
    [today]
  );

  const now = new Date();
  const currentDayIndex = days.findIndex((day) => sameDay(day, now));
  const currentRowProgress = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const showCurrentLine = currentDayIndex >= 0 && currentRowProgress >= 0 && currentRowProgress <= ROWS * 60;

  const plannerSessions = sessions.filter((session) =>
    days.some((day) => sameDay(new Date(session.date), day))
  );

  return (
    <Tooltip.Provider delayDuration={150}>
      <section className="relative flex-1 overflow-auto bg-white dark:bg-[#0D1B40]">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[76px_repeat(7,minmax(110px,1fr))] border-b border-gray-200 dark:border-gray-700">
            <div className="border-r border-gray-200 p-2 dark:border-gray-700" />
            {days.map((day, index) => {
              const isToday = sameDay(day, now);
              return (
                <div
                  key={day.toISOString()}
                  className={[
                    "border-r border-gray-200 p-2 text-center dark:border-gray-700",
                    isToday ? "bg-cyan/10" : "",
                  ].join(" ")}
                >
                  <p className={`text-xs font-semibold ${isToday ? "text-cyan" : "text-gray-500 dark:text-gray-300"}`}>
                    {dayLabelFormatter.format(day)}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-cyan" : "text-navy dark:text-white"}`}>{day.getDate()}</p>
                </div>
              );
            })}
          </div>

          <div className="relative grid grid-cols-[76px_repeat(7,minmax(110px,1fr))]">
            {Array.from({ length: ROWS }).map((_, rowIndex) => (
              <div key={`time-${rowIndex}`} className="contents">
                <div className="h-[60px] border-r border-b border-gray-200 p-1 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-300">
                  {formatHour(START_HOUR + rowIndex)}
                </div>

                {days.map((day, dayIndex) => (
                  <div
                    key={`${day.toISOString()}-${rowIndex}`}
                    className="group relative h-[60px] border-r border-b border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const subject = subjects[0];
                        if (!subject) {
                          return;
                        }
                        void addSession({
                          subjectId: subject.id,
                          topicName: "Quick Session",
                          date: day,
                          startHour: START_HOUR + rowIndex,
                          durationMinutes: 30,
                          notes: "Added from calendar cell",
                        });
                      }}
                      className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-0.5 text-cyan shadow group-hover:inline-flex dark:bg-gray-900/90"
                      aria-label="Quick add session"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {showCurrentLine && (
              <div
                className="pointer-events-none absolute left-[76px] right-0 z-10 border-t border-red-500"
                style={{ top: `${(currentRowProgress / 60) * 60}px` }}
              />
            )}

            <div
              className="absolute left-[76px] right-0 top-0 grid"
              style={{
                gridTemplateColumns: "repeat(7,minmax(110px,1fr))",
                gridTemplateRows: "repeat(17,60px)",
              }}
            >
              {plannerSessions.map((session) => {
                const subject = subjects.find((entry) => entry.id === session.subjectId);
                const subjectColor = subject?.color ?? "#00C2CB";
                const dayIndex = days.findIndex((day) => sameDay(day, new Date(session.date)));
                if (dayIndex < 0) {
                  return null;
                }

                 const scheduledStart = new Date(session.date);
                 scheduledStart.setHours(session.startHour, 0, 0, 0);
                 const isNow = Math.abs(now.getTime() - scheduledStart.getTime()) <= 15 * 60 * 1000;

                const rowStart = session.startHour - START_HOUR + 1;
                const rowSpan = Math.max(1, Math.ceil(session.durationMinutes / 60));

                return (
                  <div
                    key={`overlay-${session.id}`}
                    className="relative"
                    style={{
                      gridColumn: dayIndex + 1,
                      gridRow: `${rowStart} / span ${rowSpan}`,
                      margin: "4px",
                    }}
                  >
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          onClick={() => setEditingSession(session)}
                          className="group h-full w-full rounded-btn border-l-[3px] p-2 text-left"
                          style={{ backgroundColor: `${subjectColor}26`, borderLeftColor: subjectColor }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-navy dark:text-white">{session.topicName}</p>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300">{session.durationMinutes} min</p>
                            </div>
                            <SquarePen size={13} className="mt-0.5 shrink-0 text-gray-600 opacity-0 transition group-hover:opacity-100 dark:text-gray-200" />
                          </div>
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="top" className="z-50 rounded-btn bg-navy px-2 py-1 text-xs text-white shadow">
                          <p className="font-semibold">{session.topicName}</p>
                          <p>{subject?.name ?? "Subject"}</p>
                          <p>{formatTimeRange(session.startHour, session.durationMinutes)}</p>
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>

                    {isNow && (
                      <button
                        type="button"
                        onClick={() => {
                          void startSession(session.topicName, subject?.name ?? "Physics", session.subjectId);
                          navigate("/session");
                        }}
                        className="absolute bottom-2 right-2 rounded-btn bg-cyan px-2 py-1 text-[10px] font-semibold text-white"
                      >
                        Start Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <EditSessionModal
          open={Boolean(editingSession)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingSession(null);
            }
          }}
          session={editingSession}
        />
      </section>
    </Tooltip.Provider>
  );
}
