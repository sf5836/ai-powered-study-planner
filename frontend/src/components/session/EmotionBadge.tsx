import type { EmotionLabel } from "../../types";

type EmotionBadgeProps = {
  emotion: EmotionLabel;
};

const emotionStyles: Record<EmotionLabel, string> = {
  happy: "bg-[#dcfce7] text-[#166534]",
  neutral: "bg-[#f3f4f6] text-[#374151]",
  confused: "bg-[#fef9c3] text-[#854d0e]",
  bored: "bg-[#ede9fe] text-[#5b21b6]",
  stressed: "bg-[#fee2e2] text-[#991b1b]",
  tired: "bg-[#dbeafe] text-[#1e40af]",
  frustrated: "bg-[#ffedd5] text-[#9a3412]",
};

export default function EmotionBadge({ emotion }: EmotionBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium ${emotionStyles[emotion]}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {emotion}
    </span>
  );
}
