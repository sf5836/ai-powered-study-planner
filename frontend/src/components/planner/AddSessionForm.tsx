import { CalendarPlus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionsStore } from "../../stores/sessionsStore";

type AddSessionFormProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const durationOptions = [30, 45, 60, 90, 120] as const;

function getDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Panel({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const { subjects, sessions, addSession } = usePlannerStore(
    useShallow((state) => ({
      subjects: state.subjects,
      sessions: state.sessions,
      addSession: state.addSession,
    }))
  );
  const records = useSessionsStore((state) => state.records);

  const [form, setForm] = useState({
    subjectId: subjects[0]?.id ?? "",
    topicName: "",
    date: getDateInput(new Date()),
    time: "15:00",
    durationMinutes: 60,
    notes: "",
  });

  useEffect(() => {
    if (form.subjectId || subjects.length === 0) {
      return;
    }

    setForm((prev) => ({ ...prev, subjectId: subjects[0]?.id ?? "" }));
  }, [form.subjectId, subjects]);

  const canSubmit = Boolean(form.subjectId && form.topicName.trim() && form.date && form.time);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const fromRecords = [...records]
      .sort((a, b) => b.focusPercent - a.focusPercent)
      .map((record) => ({ subjectId: record.subjectId, name: record.topicName || "" }))
      .filter((entry) => entry.name.trim().length > 0)
      .filter((entry) => {
        const key = `${entry.subjectId}:${entry.name.toLowerCase()}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 3);

    if (fromRecords.length > 0) {
      return fromRecords;
    }

    return sessions
      .slice(-3)
      .map((session) => ({ subjectId: session.subjectId, name: session.topicName }))
      .filter((entry) => entry.name.trim().length > 0);
  }, [records, sessions]);

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    const [hour] = form.time.split(":");

    await addSession({
      subjectId: form.subjectId,
      topicName: form.topicName.trim(),
      date: new Date(form.date),
      startHour: Number(hour),
      durationMinutes: form.durationMinutes,
      notes: form.notes,
    });

    setForm((prev) => ({
      ...prev,
      topicName: "",
      notes: "",
    }));
  };

  return (
    <aside className="flex h-full w-[272px] flex-col overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0D1B40]">
      <div className="mb-3 inline-flex items-center gap-2">
        <CalendarPlus size={18} className="text-cyan" />
        <h3 className="font-display text-xl text-navy dark:text-white">Add Session</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Subject</label>
          <select
            value={form.subjectId}
            onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{`● ${subject.name}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Topic name</label>
          <input
            value={form.topicName}
            onChange={(event) => setForm((prev) => ({ ...prev, topicName: event.target.value }))}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Start time</label>
          <input
            type="time"
            step="1800"
            value={form.time}
            onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Duration</label>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, durationMinutes: duration }))}
                className={[
                  "rounded-btn border px-2.5 py-1 text-xs font-medium",
                  form.durationMinutes === duration
                    ? "border-cyan bg-cyan text-white"
                    : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200",
                ].join(" ")}
              >
                {duration === 60 ? "1h" : duration === 90 ? "1.5h" : duration === 120 ? "2h" : `${duration}m`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="w-full resize-none rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            void submit();
          }}
          className="w-full rounded-btn bg-cyan px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Session
        </button>
      </div>

      <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

      <div className="mb-2 inline-flex items-center gap-2">
        <Sparkles size={16} className="text-cyan" />
        <h4 className="text-sm font-semibold text-navy dark:text-white">AI Suggestions</h4>
      </div>

      <div className="space-y-2">
        {suggestions.map((topic) => {
          const subject = subjects.find((entry) => entry.id === topic.subjectId);
          return (
            <article key={`${topic.subjectId}-${topic.name}`} className="rounded-btn border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-1 inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject?.color ?? "#9CA3AF" }} />
                <p className="truncate text-[13px] font-semibold text-navy dark:text-white">{topic.name}</p>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-cyan">Based on recent performance</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-300">Smart pick</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  void addSession({
                    subjectId: topic.subjectId,
                    topicName: topic.name,
                    date: new Date(),
                    startHour: 15,
                    durationMinutes: 60,
                    notes: "Suggested by AI",
                  });
                }}
                className="rounded-btn border border-cyan px-2 py-1 text-xs font-semibold text-cyan"
              >
                Add this
              </button>
            </article>
          );
        })}
        {suggestions.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-300">No live suggestions yet. Complete a session to build recommendations.</p>}
      </div>

      <p className="mt-4 text-[11px] text-gray-400 dark:text-gray-300">{sessions.length} sessions planned</p>

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="mt-4 self-end text-xs text-gray-500 hover:underline dark:text-gray-300"
        >
          Close
        </button>
      )}
    </aside>
  );
}

export default function AddSessionForm({ mobileOpen, onCloseMobile }: AddSessionFormProps) {
  return (
    <>
      <div className="hidden h-full lg:block">
        <Panel />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" onClick={onCloseMobile} className="absolute inset-0 bg-black/40" aria-label="Close add session drawer" />
          <div className="absolute right-0 top-0 h-full">
            <Panel onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
