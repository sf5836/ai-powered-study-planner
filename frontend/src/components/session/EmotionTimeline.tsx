import type { EmotionEvent, EmotionLabel } from "../../types";

type EmotionTimelineProps = {
  history: EmotionEvent[];
  maxSeconds?: number;
};

type Segment = {
  emotion: EmotionLabel;
  duration: number;
};

const emotionFill: Record<EmotionLabel, string> = {
  happy: "#dcfce7",
  neutral: "#f3f4f6",
  confused: "#fef9c3",
  bored: "#ede9fe",
  stressed: "#fee2e2",
  tired: "#dbeafe",
  frustrated: "#ffedd5",
};

function buildSegments(history: EmotionEvent[], maxSeconds: number): Segment[] {
  if (history.length === 0) {
    return [];
  }

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const latest = sorted[sorted.length - 1].timestamp;
  const windowStart = Math.max(0, latest - maxSeconds);
  const result: Segment[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const event = sorted[index];
    const next = sorted[index + 1];

    const start = Math.max(event.timestamp, windowStart);
    const end = Math.max(start, Math.min(next ? next.timestamp : latest, latest));
    const duration = end - start;

    if (duration <= 0 || event.timestamp < windowStart) {
      continue;
    }

    const previous = result[result.length - 1];
    if (previous && previous.emotion === event.emotion) {
      previous.duration += duration;
    } else {
      result.push({ emotion: event.emotion, duration });
    }
  }

  return result;
}

export default function EmotionTimeline({ history, maxSeconds = 60 }: EmotionTimelineProps) {
  const segments = buildSegments(history, maxSeconds);

  return (
    <div className="h-5 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
      {segments.length === 0 ? (
        <div className="h-full w-full bg-gray-300 dark:bg-gray-600" />
      ) : (
        <div className="flex h-full w-full">
          {segments.map((segment, index) => (
            <div
              key={`${segment.emotion}-${index}`}
              className="h-full"
              style={{
                width: `${(segment.duration / maxSeconds) * 100}%`,
                backgroundColor: emotionFill[segment.emotion],
              }}
              title={`${segment.emotion} (${Math.round(segment.duration)}s)`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
