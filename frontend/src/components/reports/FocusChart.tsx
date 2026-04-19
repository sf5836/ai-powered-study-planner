import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  type ScriptableScaleContext,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useUserStore } from "../../stores/userStore";
import type { SessionRecord } from "../../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip);

type FocusChartProps = {
  sessions: SessionRecord[];
};

type DayPoint = {
  label: string;
  key: string;
  avg: number;
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function describeRange(sessionDates: Date[]): string {
  if (sessionDates.length === 0) {
    return "No dates available";
  }
  const sorted = [...sessionDates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (toDayKey(first) === toDayKey(last)) {
    return toDayLabel(first);
  }
  return `${toDayLabel(first)} - ${toDayLabel(last)}`;
}

export default function FocusChart({ sessions }: FocusChartProps) {
  const isDarkMode = useUserStore((state) => state.isDarkMode);
  const tickColor = isDarkMode ? "#D1D5DB" : "#9CA3AF";
  const gridColorStrong = isDarkMode ? "rgba(75, 85, 99, 0.5)" : "rgba(156, 163, 175, 0.22)";
  const gridColor = isDarkMode ? "rgba(75, 85, 99, 0.35)" : "rgba(156, 163, 175, 0.14)";

  const points = useMemo<DayPoint[]>(() => {
    const byDay = new Map<string, { date: Date; scores: number[] }>();

    sessions.forEach((session) => {
      const date = new Date(session.startTime);
      const key = toDayKey(date);
      const existing = byDay.get(key);
      if (!existing) {
        byDay.set(key, { date, scores: [session.focusPercent] });
      } else {
        existing.scores.push(session.focusPercent);
      }
    });

    return [...byDay.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((entry) => ({
        key: toDayKey(entry.date),
        label: toDayLabel(entry.date),
        avg: Math.round(entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length),
      }));
  }, [sessions]);

  const data = {
    labels: points.map((point) => point.label),
    datasets: [
      {
        label: "Focus %",
        data: points.map((point) => point.avg),
        borderColor: "#00C2CB",
        backgroundColor: "#00C2CB",
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 5,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: tickColor,
        },
        title: {
          display: true,
          text: "Focus %",
          color: tickColor,
          font: {
            size: 12,
            weight: "normal",
          },
        },
        grid: {
          color: (context: ScriptableScaleContext) => (context.tick.value === 0 ? gridColorStrong : gridColor),
        },
      },
    },
  };

  return (
    <article className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-navy dark:text-white">Focus Trend</h3>
        <p className="text-xs text-gray-500 dark:text-gray-300">{describeRange(sessions.map((session) => new Date(session.startTime)))}</p>
      </div>
      <div className="h-[260px]">
        <Line data={data} options={options} />
      </div>
    </article>
  );
}
