import { CalendarPlus, Menu, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AddSessionForm from "../components/planner/AddSessionForm";
import CalendarGrid from "../components/planner/CalendarGrid";
import SubjectSidebar from "../components/planner/SubjectSidebar";
import { usePlannerStore } from "../stores/plannerStore";

export default function PlannerPage() {
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const didLoadPlannerData = useRef(false);

  const generateWeeklyPlan = usePlannerStore((state) => state.generateWeeklyPlan);
  const isLoading = usePlannerStore((state) => state.isLoading);
  const error = usePlannerStore((state) => state.error);

  useEffect(() => {
    if (didLoadPlannerData.current) {
      return;
    }
    didLoadPlannerData.current = true;
    void usePlannerStore.getState().loadPlannerData();
  }, []);

  return (
    <section className="h-[calc(100vh-56px)] overflow-hidden">
      {isLoading && <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">Loading planner data...</p>}
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="hidden items-center justify-end border-b border-gray-200 px-4 py-2 dark:border-gray-700 lg:flex">
        <button
          type="button"
          onClick={() => {
            void generateWeeklyPlan();
          }}
          className="inline-flex items-center gap-1 rounded-btn border border-cyan px-3 py-1.5 text-xs font-semibold text-cyan"
        >
          <Sparkles size={14} />
          Generate Weekly Plan
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700 lg:hidden">
        <button
          type="button"
          onClick={() => setSubjectsOpen(true)}
          className="inline-flex items-center gap-1 rounded-btn border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-navy dark:border-gray-700 dark:text-white"
        >
          <Menu size={14} />
          Subjects
        </button>

        <button
          type="button"
          onClick={() => {
            void generateWeeklyPlan();
          }}
          className="inline-flex items-center gap-1 rounded-btn border border-cyan px-2.5 py-1.5 text-xs font-semibold text-cyan"
        >
          <Sparkles size={14} />
          AI Plan
        </button>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1 rounded-btn border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-navy dark:border-gray-700 dark:text-white"
        >
          <CalendarPlus size={14} />
          Add Session
        </button>
      </div>

      <div className="flex h-full overflow-hidden">
        <SubjectSidebar mobileOpen={subjectsOpen} onCloseMobile={() => setSubjectsOpen(false)} />
        <CalendarGrid />
        <AddSessionForm mobileOpen={formOpen} onCloseMobile={() => setFormOpen(false)} />
      </div>
    </section>
  );
}
