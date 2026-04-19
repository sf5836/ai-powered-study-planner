type TopicProgressBarProps = {
  topicName: string;
  subject: string;
  subjectColor: string;
  percent: number;
};

export default function TopicProgressBar({ topicName, subject, subjectColor, percent }: TopicProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-navy dark:text-white">{topicName}</p>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${subjectColor}22`, color: subjectColor }}>
          {subject}
        </span>
        <p className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-300">{clamped}%</p>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${clamped}%`, backgroundColor: subjectColor }}
        />
      </div>
    </div>
  );
}
