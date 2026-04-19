import { useEffect, useState } from "react";
import FocusMeter from "./FocusMeter";

type StudyReadinessCardProps = {
  score: number;
  calibrationSeconds: number;
};

function rating(score: number): { label: string; className: string } {
  if (score >= 71) {
    return { label: "Study Ready", className: "bg-green-100 text-[#1B8A4C] dark:bg-green-900/30 dark:text-green-200" };
  }
  if (score >= 41) {
    return { label: "Moderate", className: "bg-amber-100 text-[#E8612C] dark:bg-amber-900/30 dark:text-amber-200" };
  }
  return { label: "Not Ready", className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-200" };
}

export default function StudyReadinessCard({ score, calibrationSeconds }: StudyReadinessCardProps) {
  const [dots, setDots] = useState(".");
  const state = rating(score);

  useEffect(() => {
    if (calibrationSeconds >= 30) {
      return;
    }

    const timer = window.setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : `${prev}.`));
    }, 400);

    return () => {
      window.clearInterval(timer);
    };
  }, [calibrationSeconds]);

  if (calibrationSeconds < 30) {
    return (
      <article className="rounded-card bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
        <div className="flex items-center gap-4">
          <div className="origin-top-left scale-[0.55]">
            <FocusMeter score={Math.min(100, (calibrationSeconds / 30) * score)} />
          </div>
          <div className="-ml-8">
            <p className="text-sm font-medium text-navy dark:text-white">Calibrating{dots}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">please look at the camera</p>
            <p className="mt-2 text-xs font-medium text-cyan">{calibrationSeconds}s / 30s</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="flex justify-center">
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${state.className}`}>
        <strong>{score}</strong>
        <span>{state.label}</span>
      </span>
    </div>
  );
}
