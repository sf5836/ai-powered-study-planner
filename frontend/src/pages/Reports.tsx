import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import EmotionChart from "../components/reports/EmotionChart";
import FilterBar from "../components/reports/FilterBar";
import FocusChart from "../components/reports/FocusChart";
import SessionsTable from "../components/reports/SessionsTable";
import SummaryCards from "../components/reports/SummaryCards";
import TopicGrid from "../components/reports/TopicGrid";
import { usePlannerStore } from "../stores/plannerStore";
import { useSessionsStore } from "../stores/sessionsStore";
import type { SessionRecord } from "../types";

type RangeValue = "7d" | "30d" | "all";

type FilterState = {
  range: RangeValue;
  subjectId: string | "all";
};

function filterSessions(records: SessionRecord[], range: RangeValue, subjectId: string | "all"): SessionRecord[] {
  const now = new Date();
  const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : null;

  return records.filter((record) => {
    const subjectMatch = subjectId === "all" || record.subjectId === subjectId;
    if (!subjectMatch) {
      return false;
    }

    if (daysBack === null) {
      return true;
    }

    const threshold = new Date(now);
    threshold.setDate(now.getDate() - daysBack);
    return new Date(record.startTime) >= threshold;
  });
}

export default function ReportsPage() {
  const { records, summary, deleteRecord, loadRecords, loadSummary, generateAndDownloadReport, isLoading, error } = useSessionsStore(
    useShallow((state) => ({
      records: state.records,
      summary: state.summary,
      deleteRecord: state.deleteRecord,
      loadRecords: state.loadRecords,
      loadSummary: state.loadSummary,
      generateAndDownloadReport: state.generateAndDownloadReport,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );
  const plannerSubjects = usePlannerStore((state) => state.subjects);

  const [filters, setFilters] = useState<FilterState>({
    range: "7d",
    subjectId: "all",
  });
  const [reportMessage, setReportMessage] = useState<string>("");

  useEffect(() => {
    void useSessionsStore.getState().loadRecords(filters.range, filters.subjectId);
    void useSessionsStore.getState().loadSummary(filters.range, filters.subjectId);
  }, [filters.range, filters.subjectId]);

  const filtered = useMemo(
    () => filterSessions(records, filters.range, filters.subjectId),
    [filters.range, filters.subjectId, records]
  );

  return (
    <section className="space-y-6 p-6">
      <FilterBar subjects={plannerSubjects} onFilterChange={setFilters} />

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-300">Loading reports...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {reportMessage && <p className="text-sm text-cyan">{reportMessage}</p>}

      <SummaryCards sessions={filtered} subjects={plannerSubjects} summary={summary} />

      <div className="grid gap-4 lg:grid-cols-2">
        <FocusChart sessions={filtered} />
        <EmotionChart sessions={filtered} />
      </div>

      <SessionsTable
        sessions={filtered}
        subjects={plannerSubjects}
        onDownload={(id) => {
          void generateAndDownloadReport(id)
            .then((result) => {
              if (result === "queued") {
                setReportMessage("Report generation queued. Try download again in a moment.");
              } else {
                setReportMessage("Report downloaded successfully.");
              }
            })
            .catch((downloadError) => {
              setReportMessage(downloadError instanceof Error ? downloadError.message : "Report action failed");
            });
        }}
        onDelete={(id) => {
          void deleteRecord(id);
        }}
      />

      <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-bold text-navy dark:text-white">Topic Preparation</h3>
        <TopicGrid />
      </div>
    </section>
  );
}
