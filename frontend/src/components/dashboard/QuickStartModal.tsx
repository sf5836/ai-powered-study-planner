import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionStore } from "../../stores/sessionStore";

type QuickStartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function QuickStartModal({ open, onOpenChange }: QuickStartModalProps) {
  const navigate = useNavigate();
  const startSession = useSessionStore((state) => state.startSession);
  const subjects = usePlannerStore((state) => state.subjects);
  const sessions = usePlannerStore((state) => state.sessions);

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicName, setTopicName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      void usePlannerStore.getState().loadPlannerData();
    }
  }, [open]);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
  }, [subjectId, subjects]);

  const subjectOptions = subjects;
  const topicOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .filter((session) => session.subjectId === subjectId)
            .map((session) => session.topicName)
            .filter(Boolean)
        )
      ),
    [sessions, subjectId]
  );

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  const canBegin = Boolean(selectedSubject && topicName.trim());

  const handleBegin = async () => {
    if (!selectedSubject || !topicName.trim()) {
      return;
    }

    await startSession(topicName.trim(), selectedSubject.name, selectedSubject.id);
    onOpenChange(false);
    navigate("/session");
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-white p-6 shadow-xl focus:outline-none dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <Dialog.Title className="font-display text-2xl text-navy dark:text-white">Start a Study Session</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:hover:bg-white/10"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-100">
                Subject
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selectedSubject?.color ?? "#9CA3AF" }}
                  aria-hidden="true"
                />
                <select
                  id="subject"
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setTopicName("");
                  }}
                  className="w-full rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition hover:border-gray-400 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/35 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>{`● ${subject.name}`}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-100">
                Topic
              </label>
              <input
                id="topic"
                list="quickstart-topic-options"
                value={topicName}
                onChange={(event) => setTopicName(event.target.value)}
                placeholder="Enter topic name"
                className="w-full rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition hover:border-gray-400 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/35 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <datalist id="quickstart-topic-options">
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-100">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What's your goal for this session?"
                rows={3}
                className="w-full resize-none rounded-btn border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition hover:border-gray-400 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/35 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
          </div>

          <footer className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                void handleBegin();
              }}
              disabled={!canBegin}
              className="rounded-btn bg-cyan px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:cursor-not-allowed disabled:opacity-50"
            >
              Begin Session →
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
