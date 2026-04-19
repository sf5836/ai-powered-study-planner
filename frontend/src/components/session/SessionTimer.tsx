import { useSessionTimer } from "../../hooks/useSessionTimer";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function SessionTimer() {
  const { hours, minutes, seconds } = useSessionTimer();

  return (
    <div className="text-center">
      <p className="font-mono text-5xl font-bold tracking-tight text-navy dark:text-white">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </p>
    </div>
  );
}
