import { useEffect } from "react";
import { useSessionStore } from "../stores/sessionStore";

type SessionTimerResult = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function useSessionTimer(): SessionTimerResult {
  const isActive = useSessionStore((state) => state.isActive);
  const isPaused = useSessionStore((state) => state.isPaused);
  const elapsedSeconds = useSessionStore((state) => state.elapsedSeconds);

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      useSessionStore.setState((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isActive, isPaused]);

  return {
    hours: Math.floor(elapsedSeconds / 3600),
    minutes: Math.floor((elapsedSeconds % 3600) / 60),
    seconds: elapsedSeconds % 60,
  };
}
