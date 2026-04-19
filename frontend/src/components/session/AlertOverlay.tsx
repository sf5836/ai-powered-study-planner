import { AlertTriangle, PauseCircle, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";

export default function AlertOverlay() {
  const alertLevel = useSessionStore((state) => state.alertLevel);
  const setAlertLevel = useSessionStore((state) => state.setAlertLevel);
  const resumeSession = useSessionStore((state) => state.resumeSession);

  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    if (alertLevel !== 1) {
      return;
    }
    const timer = window.setTimeout(() => setAlertLevel(0), 5000);
    return () => window.clearTimeout(timer);
  }, [alertLevel, setAlertLevel]);

  useEffect(() => {
    if (alertLevel !== 2) {
      setSlideIn(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setSlideIn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [alertLevel]);

  if (alertLevel === 0) {
    return null;
  }

  if (alertLevel === 1) {
    return <div className="pointer-events-none fixed inset-0 z-40 animate-pulse shadow-[inset_0_0_0_4px_#00C2CB]" aria-hidden="true" />;
  }

  if (alertLevel === 2) {
    return (
      <div
        className={[
          "fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between bg-[#E8612C] px-6 text-white transition-transform duration-300",
          slideIn ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle size={18} />
          <span>You seem distracted. Refocus!</span>
        </div>
        <button
          type="button"
          onClick={() => setAlertLevel(0)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-btn hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (alertLevel === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-sm rounded-card border-2 border-red-500 bg-white p-8 text-center dark:bg-gray-900">
          <Volume2 size={38} className="mx-auto text-red-500" />
          <h3 className="mt-3 text-[20px] font-bold text-navy dark:text-white">Hey! You&apos;ve lost focus</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Take a deep breath and refocus.</p>
          <button
            type="button"
            onClick={() => setAlertLevel(0)}
            className="mt-5 w-full rounded-btn bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          >
            I&apos;m back — Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 text-center dark:bg-gray-900">
        <PauseCircle size={40} className="mx-auto text-navy dark:text-cyan" />
        <h3 className="mt-3 font-display text-3xl text-navy dark:text-white">Session Paused</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Take your time.</p>
        <button
          type="button"
          onClick={() => {
            void resumeSession();
            setAlertLevel(0);
          }}
          className="mt-6 w-full rounded-btn bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Resume when ready
        </button>
      </div>
    </div>
  );
}
