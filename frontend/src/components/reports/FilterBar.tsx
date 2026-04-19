import { useMemo, useState } from "react";
import type { Subject } from "../../types";

type RangeValue = "7d" | "30d" | "all";

type FilterValue = {
  range: RangeValue;
  subjectId: string | "all";
};

type FilterBarProps = {
  subjects: Subject[];
  onFilterChange: (filter: FilterValue) => void;
};

const rangeOptions: Array<{ value: RangeValue; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export default function FilterBar({ subjects, onFilterChange }: FilterBarProps) {
  const [range, setRange] = useState<RangeValue>("7d");
  const [subjectId, setSubjectId] = useState<string | "all">("all");

  const filterValue = useMemo(() => ({ range, subjectId }), [range, subjectId]);

  const updateRange = (nextRange: RangeValue) => {
    setRange(nextRange);
    onFilterChange({ ...filterValue, range: nextRange });
  };

  const updateSubject = (nextSubject: string | "all") => {
    setSubjectId(nextSubject);
    onFilterChange({ ...filterValue, subjectId: nextSubject });
  };

  return (
    <section className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateRange(option.value)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                range === option.value
                  ? "border-cyan bg-cyan text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/60",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-[260px]">
          <label htmlFor="subject-filter" className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-300">
            Subject
          </label>
          <select
            id="subject-filter"
            value={subjectId}
            onChange={(event) => updateSubject(event.target.value as string | "all")}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id} style={{ color: subject.color }}>
                {`● ${subject.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
