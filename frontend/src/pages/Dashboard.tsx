import { useEffect, useRef } from "react";
import LastSessionCard from "../components/dashboard/LastSessionCard";
import QuickStartButton from "../components/dashboard/QuickStartButton";
import StatsRow from "../components/dashboard/StatsRow";
import StreakCalendar from "../components/dashboard/StreakCalendar";
import TodayScheduleStrip from "../components/dashboard/TodayScheduleStrip";
import UpcomingDeadlines from "../components/dashboard/UpcomingDeadlines";
import { usePlannerStore } from "../stores/plannerStore";
import { useSessionsStore } from "../stores/sessionsStore";
import { useAuthStore } from "../store/authStore";

function getGreetingHour(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

export default function DashboardPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadPlannerData = usePlannerStore((state) => state.loadPlannerData);
  const loadRecords = useSessionsStore((state) => state.loadRecords);
  const loadSummary = useSessionsStore((state) => state.loadSummary);
  const didLoad = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || didLoad.current) {
      return;
    }

    didLoad.current = true;
    void loadPlannerData();
    void loadRecords();
    void loadSummary();
  }, [isAuthenticated, loadPlannerData, loadRecords, loadSummary]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl text-navy dark:text-white sm:text-3xl">{getGreetingHour(now)}, Faraz 👋</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{dateLabel}</p>
      </header>

      <div className="mt-5 space-y-5">
        <StatsRow />
        <QuickStartButton />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <TodayScheduleStrip />
            <LastSessionCard />
          </div>

          <div className="space-y-5">
            <UpcomingDeadlines />
            <StreakCalendar />
          </div>
        </div>
      </div>
    </section>
  );
}
