import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "../../stores/plannerStore";

type SubjectSidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const palette = ["#EF4444", "#2563EB", "#16A34A", "#7B2FBE", "#E8612C", "#EC4899", "#14B8A6"];

function SubjectPanel({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const { subjects, addSubject, updateSubject, deleteSubject } = usePlannerStore(
    useShallow((state) => ({
      subjects: state.subjects,
      addSubject: state.addSubject,
      updateSubject: state.updateSubject,
      deleteSubject: state.deleteSubject,
    }))
  );

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(palette[1]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const canAdd = useMemo(() => newName.trim().length > 0, [newName]);

  const commitAdd = () => {
    if (!canAdd) {
      return;
    }
    void addSubject({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(palette[1]);
    setShowAdd(false);
  };

  return (
    <aside className="flex h-full w-48 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0D1B40]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy dark:text-white">Subjects</h3>
        <button
          type="button"
          onClick={() => setShowAdd((prev) => !prev)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-cyan hover:bg-cyan/10"
          aria-label="Add subject"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1.5 overflow-y-auto pr-1">
        {subjects.map((subject) => {
          const isEditing = editId === subject.id;
          return (
            <div key={subject.id} className="group flex items-center gap-2 rounded-btn px-1 py-1 hover:bg-gray-100 dark:hover:bg-white/10">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />

              {isEditing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-300 px-1 py-0.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditId(subject.id);
                    setEditName(subject.name);
                  }}
                  className="min-w-0 flex-1 truncate text-left text-sm text-gray-800 dark:text-gray-100"
                >
                  {subject.name}
                </button>
              )}

              <div className="ml-auto inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextName = editName.trim() || subject.name;
                      void updateSubject(subject.id, { name: nextName });
                      setEditId(null);
                    }}
                    className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                    aria-label="Save subject name"
                  >
                    <Check size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(subject.id);
                      setEditName(subject.name);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                    aria-label="Edit subject"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void deleteSubject(subject.id);
                  }}
                  className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                  aria-label="Delete subject"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="mt-4 rounded-card border border-gray-200 p-3 dark:border-gray-700">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Subject name"
            className="mb-2 w-full rounded-btn border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="mb-2 flex flex-wrap gap-2">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className={[
                  "h-5 w-5 rounded-full",
                  newColor === color ? "ring-2 ring-offset-2 ring-cyan" : "",
                ].join(" ")}
                style={{ backgroundColor: color }}
                aria-label={`Pick ${color}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canAdd}
              onClick={commitAdd}
              className="rounded-btn bg-cyan px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-xs text-gray-500 hover:underline dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="mt-auto inline-flex items-center gap-1 self-end rounded-btn text-xs text-gray-500 hover:text-gray-700 dark:text-gray-300"
        >
          <X size={12} />
          Close
        </button>
      )}
    </aside>
  );
}

export default function SubjectSidebar({ mobileOpen, onCloseMobile }: SubjectSidebarProps) {
  return (
    <>
      <div className="hidden h-full lg:block">
        <SubjectPanel />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" onClick={onCloseMobile} className="absolute inset-0 bg-black/40" aria-label="Close subjects drawer" />
          <div className="absolute left-0 top-0 h-full">
            <SubjectPanel onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
