import {
  ArcElement,
  Chart as ChartJS,
  type ChartOptions,
  type Plugin,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { useUserStore } from "../../stores/userStore";
import type { EmotionLabel, SessionRecord } from "../../types";

ChartJS.register(ArcElement, Tooltip);

type EmotionChartProps = {
  sessions: SessionRecord[];
};

const emotionColors: Record<EmotionLabel, string> = {
  happy: "#4ade80",
  neutral: "#9ca3af",
  confused: "#fbbf24",
  bored: "#a78bfa",
  stressed: "#f87171",
  tired: "#60a5fa",
  frustrated: "#fb923c",
};

const emotionOrder: EmotionLabel[] = ["happy", "neutral", "confused", "bored", "stressed", "tired", "frustrated"];

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function EmotionChart({ sessions }: EmotionChartProps) {
  const isDarkMode = useUserStore((state) => state.isDarkMode);

  const centerTextPlugin = useMemo<Plugin<"doughnut">>(
    () => ({
      id: `centerText-${isDarkMode ? "dark" : "light"}`,
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const x = chart.getDatasetMeta(0).data[0]?.x;
        const y = chart.getDatasetMeta(0).data[0]?.y;
        if (!x || !y) {
          return;
        }

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "600 13px Inter, sans-serif";
        ctx.fillStyle = isDarkMode ? "#D1D5DB" : "#6B7280";
        ctx.fillText("Emotions", x, y);
        ctx.restore();
      },
    }),
    [isDarkMode]
  );

  const totals = useMemo(() => {
    const base: Record<EmotionLabel, number> = {
      happy: 0,
      neutral: 0,
      confused: 0,
      bored: 0,
      stressed: 0,
      tired: 0,
      frustrated: 0,
    };

    sessions.forEach((session) => {
      emotionOrder.forEach((emotion) => {
        base[emotion] += session.emotionBreakdown[emotion] ?? 0;
      });
    });

    return base;
  }, [sessions]);

  const totalAll = emotionOrder.reduce((sum, emotion) => sum + totals[emotion], 0);

  const data = {
    labels: emotionOrder.map((emotion) => sentenceCase(emotion)),
    datasets: [
      {
        data: emotionOrder.map((emotion) => totals[emotion]),
        backgroundColor: emotionOrder.map((emotion) => emotionColors[emotion]),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <article className="rounded-card bg-white p-5 shadow-sm dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-bold text-navy dark:text-white">Emotion Distribution</h3>
      <div className="h-[260px]">
        <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {emotionOrder.map((emotion) => {
          const percent = totalAll > 0 ? Math.round((totals[emotion] / totalAll) * 100) : 0;
          return (
            <span
              key={emotion}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-600 dark:text-gray-200"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: emotionColors[emotion] }} />
              {sentenceCase(emotion)} {percent}%
            </span>
          );
        })}
      </div>
    </article>
  );
}
