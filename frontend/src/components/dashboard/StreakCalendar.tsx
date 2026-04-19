import { Flame } from "lucide-react";
import { useSessionsStore } from "../../stores/sessionsStore";
import { useUserStore } from "../../stores/userStore";

const CELL_SIZE = 12;
const GAP = 3;
const COLUMNS = 6;
const ROWS = 5;
const GRID_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
const GRID_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
const LABEL_SPACE = 12;

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthShort(date: Date): string {
  return date.toLocaleString([], { month: "short" });
}

type DayCell = {
  date: Date;
  studied: boolean;
  x: number;
  y: number;
  monthLabel?: string;
};

function buildCells(sessionRecords: Array<{ startTime: Date }>): DayCell[] {
  const studiedDays = new Set(sessionRecords.map((record) => getDateKey(new Date(record.startTime))));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DayCell[] = [];

  for (let index = 0; index < 30; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + index);

    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);

    const previousDate = index > 0 ? new Date(today) : null;
    if (previousDate) {
      previousDate.setDate(today.getDate() - 29 + (index - 1));
    }

    const startsMonth = index === 0 || (previousDate ? previousDate.getMonth() !== date.getMonth() : false);

    days.push({
      date,
      studied: studiedDays.has(getDateKey(date)),
      x: col * (CELL_SIZE + GAP),
      y: LABEL_SPACE + row * (CELL_SIZE + GAP),
      monthLabel: startsMonth ? monthShort(date) : undefined,
    });
  }

  return days;
}

export default function StreakCalendar() {
  const sessionRecords = useSessionsStore((state) => state.records);
  const isDarkMode = useUserStore((state) => state.isDarkMode);
  const cells = buildCells(sessionRecords);

  return (
    <section className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
      <header className="mb-4 flex items-center gap-2">
        <Flame size={18} className="text-[#E8612C]" />
        <h3 className="font-display text-xl text-navy dark:text-white">Study Streak</h3>
      </header>

      <svg
        width="100%"
        viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT + LABEL_SPACE}`}
        role="img"
        aria-label="Study streak calendar"
      >
        {cells.map((cell, index) => (
          <g key={index}>
            {cell.monthLabel && (
              <text x={cell.x} y={9} fontSize="8" fill="#6B7280">
                {cell.monthLabel}
              </text>
            )}
            <rect
              x={cell.x}
              y={cell.y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={3}
              fill={cell.studied ? "#1B8A4C" : isDarkMode ? "#374151" : "#E5E7EB"}
            >
              <title>{cell.date.toDateString()}</title>
            </rect>
          </g>
        ))}
      </svg>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-300">Green cells indicate days with one or more study sessions.</p>
    </section>
  );
}
