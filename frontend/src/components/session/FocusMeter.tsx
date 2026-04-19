import { useUserStore } from "../../stores/userStore";

type FocusMeterProps = {
  score: number;
};

const CIRCUMFERENCE = 283;

function arcColor(score: number): string {
  if (score <= 40) {
    return "#E24B4A";
  }
  if (score <= 65) {
    return "#EF9F27";
  }
  return "#1B8A4C";
}

export default function FocusMeter({ score }: FocusMeterProps) {
  const isDarkMode = useUserStore((state) => state.isDarkMode);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dashOffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className="flex h-[160px] w-[160px] items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`Focus score ${clamped}`}>
        <circle cx="60" cy="60" r="45" fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={arcColor(clamped)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x="60" y="58" textAnchor="middle" style={{ fill: isDarkMode ? "#F3F4F6" : "#1A2E6E" }} className="text-[24px] font-bold">
          {clamped}
        </text>
        <text x="60" y="74" textAnchor="middle" style={{ fill: isDarkMode ? "#D1D5DB" : "#6B7280" }} className="text-[11px]">
          Focus
        </text>
      </svg>
    </div>
  );
}
