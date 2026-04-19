import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import ConfirmModal from "../ui/ConfirmModal";
import { usePlannerStore } from "../../stores/plannerStore";
import type { PlannerSession } from "../../types";

type EditSessionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PlannerSession | null;
};

const durationOptions = [30, 45, 60, 90, 120] as const;

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function parseHour(timeValue: string): number {
  const [hour] = timeValue.split(":");
  return Number(hour);
}

export default function EditSessionModal({ open, onOpenChange, session }: EditSessionModalProps) {
  const { subjects, updateSession, deleteSession } = usePlannerStore(
    useShallow((state) => ({
      subjects: state.subjects,
      updateSession: state.updateSession,
      deleteSession: state.deleteSession,
    }))
  );

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    subjectId: "",
    topicName: "",
    date: "",
    time: "08:00",
    durationMinutes: 60,
    notes: "",
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    setForm({
      subjectId: session.subjectId,
      topicName: session.topicName,
      date: formatDateInput(new Date(session.date)),
      time: formatTimeInput(session.startHour),
      durationMinutes: session.durationMinutes,
      notes: session.notes,
    });
    setDeleteConfirmOpen(false);
  }, [session]);

  const canSave = Boolean(form.subjectId && form.topicName.trim() && form.date);

  const saveChanges = async () => {
    if (!session || !canSave) {
      return;
    }

    await updateSession(session.id, {
      subjectId: form.subjectId,
      topicName: form.topicName.trim(),
      date: new Date(form.date),
      startHour: parseHour(form.time),
      durationMinutes: form.durationMinutes,
      notes: form.notes,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!session) {
      return;
    }
    await deleteSession(session.id);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-white p-6 shadow-xl dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <Dialog.Title className="font-display text-2xl text-navy dark:text-white">Edit Session</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Subject</label>
              <select
                value={form.subjectId}
                onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
                className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Topic Name</label>
              <input
                value={form.topicName}
                onChange={(event) => setForm((prev) => ({ ...prev, topicName: event.target.value }))}
                className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Start Time</label>
                <input
                  type="time"
                  step="1800"
                  value={form.time}
                  onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                  className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-navy dark:text-white">Duration</label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, durationMinutes: value }))}
                    className={[
                      "rounded-btn border px-3 py-1.5 text-xs font-medium transition",
                      form.durationMinutes === value
                        ? "border-cyan bg-cyan text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {value === 60 ? "1h" : value === 90 ? "1.5h" : value === 120 ? "2h" : `${value}m`}
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
          </div>

          <footer className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1 rounded-btn border border-red-500 px-3 py-2 text-sm font-semibold text-red-600"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                void saveChanges();
              }}
              disabled={!canSave}
              className="rounded-btn bg-cyan px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save changes
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this planned session?"
        description="This will remove the session from your planner calendar."
        confirmLabel="Yes, delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </Dialog.Root>
  );
}
