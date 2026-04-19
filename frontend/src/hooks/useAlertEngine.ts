import { useEffect, useRef } from "react";
import { useSessionStore } from "../stores/sessionStore";

export function useAlertEngine(): void {
  const focusScore = useSessionStore((state) => state.focusScore);
  const alertLevel = useSessionStore((state) => state.alertLevel);
  const setAlertLevel = useSessionStore((state) => state.setAlertLevel);

  const belowCounterRef = useRef(0);

  useEffect(() => {
    if (focusScore < 40) {
      belowCounterRef.current += 1;

      if (belowCounterRef.current >= 5 && alertLevel < 2) {
        setAlertLevel(2);
      }

      if (belowCounterRef.current >= 15 && alertLevel >= 2 && alertLevel < 3) {
        setAlertLevel(3);
      }
      return;
    }

    belowCounterRef.current = 0;
  }, [alertLevel, focusScore, setAlertLevel]);
}
