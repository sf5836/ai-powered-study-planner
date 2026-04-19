import { BookOpen, Calendar, Flame, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import { usePlannerStore } from "../../stores/plannerStore";
import { useSessionsStore } from "../../stores/sessionsStore";

type TrendDirection = "up" | "down";

type StatCard = {
  key: string;
  title: string;
  value: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  iconColor: string;
  trendText: string;
  trendDirection: TrendDirection;
};

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getCurrentStreak(sessionRecords: Array<{ startTime: Date }>): number {
  const studied = new Set(sessionRecords.map((record) => getDateKey(new Date(record.startTime))));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (studied.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLastWeekStreak(sessionRecords: Array<{ startTime: Date }>): number {
  const studied = new Set(sessionRecords.map((record) => getDateKey(new Date(record.startTime))));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 7);

  let streak = 0;
  while (studied.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getTodayFocus(sessionRecords: Array<{ startTime: Date; focusPercent: number }>): number {
  const now = new Date();
  const todayRecords = sessionRecords.filter((record) => {
    const date = new Date(record.startTime);
    return date.toDateString() === now.toDateString();
  });

  if (todayRecords.length === 0) {
    return Math.round(sessionRecords[sessionRecords.length - 1]?.focusPercent ?? 0);
  }

  const total = todayRecords.reduce((sum, record) => sum + record.focusPercent, 0);
  return Math.round(total / todayRecords.length);
}

function getSessionsThisWeek(sessionRecords: Array<{ startTime: Date }>): { current: number; previous: number } {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const current = sessionRecords.filter((record) => new Date(record.startTime) >= currentWeekStart).length;
  const previous = sessionRecords.filter((record) => {
    const date = new Date(record.startTime);
    return date >= previousWeekStart && date < currentWeekStart;
  }).length;

  return { current, previous };
}

function getTopicsInProgress(topicNames: string[]): number {
  return new Set(topicNames.map((name) => name.trim()).filter(Boolean)).size;
}

export default function StatsRow() {
  const sessionRecords = useSessionsStore((state) => state.records);
  const plannerSessions = usePlannerStore((state) => state.sessions);

  const todayFocus = getTodayFocus(sessionRecords);
  const previousFocus = Math.max(0, todayFocus - 5);
  const focusChange = todayFocus - previousFocus;

  const streak = getCurrentStreak(sessionRecords);
  const previousStreak = getLastWeekStreak(sessionRecords);
  const streakDiff = streak - previousStreak;

  const weekStats = getSessionsThisWeek(sessionRecords);
  const weekDiff = weekStats.current - weekStats.previous;

  const inProgress = getTopicsInProgress(plannerSessions.map((session) => session.topicName));
  const previousInProgress = inProgress + 1;
  const inProgressDiff = inProgress - previousInProgress;

  const cards: StatCard[] = [
    {
      key: "focus",
      title: "Today's Focus Score",
      value: `${todayFocus}%`,
      icon: Target,
      iconColor: "text-cyan",
      trendText: `${focusChange >= 0 ? "+" : ""}${focusChange}%`,
      trendDirection: focusChange >= 0 ? "up" : "down",
    },
    {
      key: "streak",
      title: "Day Streak",
      value: `${streak}`,
      icon: Flame,
      iconColor: "text-[#E8612C]",
      trendText: `${streakDiff >= 0 ? "+" : ""}${streakDiff} days`,
      trendDirection: streakDiff >= 0 ? "up" : "down",
    },
    {
      key: "sessions",
      title: "Sessions This Week",
      value: `${weekStats.current}`,
      icon: Calendar,
      iconColor: "text-purple",
      trendText: weekDiff === 0 ? "0% same as last week" : `${weekDiff >= 0 ? "+" : ""}${weekDiff}`,
      trendDirection: weekDiff < 0 ? "down" : "up",
    },
    {
      key: "topics",
      title: "Topics In Progress",
      value: `${inProgress}`,
      icon: BookOpen,
      iconColor: "text-navy dark:text-cyan",
      trendText: `${Math.abs(inProgressDiff)} topic`,
      trendDirection: "down",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Dashboard stats">
      {cards.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.trendDirection === "up" ? TrendingUp : TrendingDown;
        const trendColor = card.trendDirection === "up" ? "text-[#1B8A4C]" : "text-red-500";

        return (
          <article
            key={card.key}
            className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-300">{card.title}</p>
              <Icon size={20} className={card.iconColor} />
            </div>
            <p className="mt-2 text-3xl font-semibold text-navy dark:text-white">{card.value}</p>
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon size={14} />
              <span>{card.trendText}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
