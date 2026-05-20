import { CameraOff, Coffee, PauseCircle, StopCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBeforeUnload, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import ConfirmModal from "../components/ui/ConfirmModal";
import AlertOverlay from "../components/session/AlertOverlay";
import EmotionBadge from "../components/session/EmotionBadge";
import EmotionTimeline from "../components/session/EmotionTimeline";
import FocusMeter from "../components/session/FocusMeter";
import GestureStatusRow from "../components/session/GestureStatusRow";
import SessionTimer from "../components/session/SessionTimer";
import StudyReadinessCard from "../components/session/StudyReadinessCard";
import TopicProgressBar from "../components/session/TopicProgressBar";
import QuickStartModal from "../components/dashboard/QuickStartModal";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useSessionSignals } from "../hooks/useSessionSignals";
import { useWebcam } from "../hooks/useWebcam";
import { usePlannerStore } from "../stores/plannerStore";
import { useSessionStore } from "../stores/sessionStore";

function focusStatus(score: number): { text: string; className: string } {
  if (score >= 66) {
    return { text: "Great!", className: "text-[#1B8A4C]" };
  }
  if (score >= 41) {
    return { text: "Okay", className: "text-[#E8612C]" };
  }
  return { text: "Needs attention", className: "text-red-500" };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function SessionPage() {
  const navigate = useNavigate();

  const {
    backendSessionId,
    isActive,
    isPaused,
    currentTopic,
    currentSubject,
    focusScore,
    studyReadinessScore,
    currentEmotion,
    gestureFlags,
    emotionHistory,
    sessionNotes,
    calibrationSeconds,
    elapsedSeconds,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    setAlertLevel,
    appendNote,
    setCalibrationSeconds,
    syncActiveSession,
    pushEvent,
  } = useSessionStore(
    useShallow((state) => ({
      isActive: state.isActive,
      backendSessionId: state.backendSessionId,
      isPaused: state.isPaused,
      currentTopic: state.currentTopic,
      currentSubject: state.currentSubject,
      focusScore: state.focusScore,
      studyReadinessScore: state.studyReadinessScore,
      currentEmotion: state.currentEmotion,
      gestureFlags: state.gestureFlags,
      emotionHistory: state.emotionHistory,
      sessionNotes: state.sessionNotes,
      calibrationSeconds: state.calibrationSeconds,
      elapsedSeconds: state.elapsedSeconds,
      startSession: state.startSession,
      pauseSession: state.pauseSession,
      resumeSession: state.resumeSession,
      endSession: state.endSession,
      setAlertLevel: state.setAlertLevel,
      appendNote: state.appendNote,
      setCalibrationSeconds: state.setCalibrationSeconds,
      syncActiveSession: state.syncActiveSession,
      pushEvent: state.pushEvent,
    }))
  );

  const plannerSubjects = usePlannerStore((state) => state.subjects);

  const { videoRef, isPermitted, isLoading, error, stopWebcam } = useWebcam();
  useAlertEngine();
  useSessionSignals({ videoRef, isActive, isPaused });

  const [breakOpen, setBreakOpen] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(300);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [startModalOpen, setStartModalOpen] = useState(false);

  useBeforeUnload(
    (event) => {
      if (isActive) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    { capture: true }
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleAnchorNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) {
        return;
      }

      if (href === window.location.pathname) {
        return;
      }

      event.preventDefault();
      setPendingPath(href);
      setLeaveConfirmOpen(true);
    };

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.pathname);
      setPendingPath("__BACK__");
      setLeaveConfirmOpen(true);
    };

    document.addEventListener("click", handleAnchorNavigation, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleAnchorNavigation, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isActive]);

  const subjectColor = useMemo(() => {
    const subject = plannerSubjects.find((entry) => entry.name === currentSubject);
    return subject?.color ?? "#1A2E6E";
  }, [currentSubject, plannerSubjects]);

  useEffect(() => {
    void syncActiveSession();
  }, [syncActiveSession]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  useEffect(() => {
    if (!isActive || calibrationSeconds >= 30) {
      return;
    }

    const timer = window.setInterval(() => {
      useSessionStore.setState((state) => ({
        calibrationSeconds: Math.min(30, state.calibrationSeconds + 1),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [calibrationSeconds, isActive, setCalibrationSeconds]);

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    void pushEvent();
  }, [elapsedSeconds, isActive, isPaused, pushEvent]);

  useEffect(() => {
    if (!breakOpen) {
      return;
    }

    if (breakSeconds <= 0) {
      setBreakOpen(false);
      void resumeSession();
      return;
    }

    const timer = window.setInterval(() => {
      setBreakSeconds((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breakOpen, breakSeconds, resumeSession]);

  const status = focusStatus(focusScore);

  return (
    <section className="relative p-4 sm:p-6">
      {!isActive && (
        <div className="mb-5 rounded-card border border-dashed border-cyan/60 bg-white p-4 text-sm text-gray-600 shadow-sm dark:border-cyan/40 dark:bg-gray-900 dark:text-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-navy dark:text-white">No active session yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Start a session to enable realtime focus, emotion, and gesture tracking.</p>
            </div>
            <button
              type="button"
              onClick={() => setStartModalOpen(true)}
              className="inline-flex items-center justify-center rounded-btn bg-cyan px-4 py-2 text-xs font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              Start Session
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <article className="relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <div className="relative h-[320px] w-full sm:h-[360px] lg:h-[420px]">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

              {(isLoading || !isPermitted || error) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100/90 text-gray-600 dark:bg-gray-900/90 dark:text-gray-200">
                  <CameraOff size={48} />
                  <p className="text-sm">{isLoading ? "Requesting webcam access..." : error ?? "Webcam not available."}</p>
                </div>
              )}

              <div className="absolute left-2 top-2">
                <EmotionBadge emotion={currentEmotion} />
              </div>

              {isActive && (
                <div className="absolute right-2 top-2 inline-flex items-center gap-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  AI Active
                </div>
              )}
            </div>
          </article>

          <article className="rounded-card bg-white p-4 text-center shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 sm:min-h-[220px]">
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-300">Focus Score</p>
            <div className="flex justify-center">
              <FocusMeter score={focusScore} />
            </div>
            <p className={`text-sm font-semibold ${status.className}`}>{status.text}</p>
          </article>

          <article className="rounded-card bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 sm:min-h-[120px]">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-300">Last 60s emotions</p>
            <EmotionTimeline history={emotionHistory} maxSeconds={60} />
          </article>

          <article className="rounded-card bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 sm:min-h-[120px]">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-300">Gesture Detection</p>
            <GestureStatusRow flags={gestureFlags} />
          </article>
        </div>

        <div className="flex flex-col gap-4">
          <StudyReadinessCard score={studyReadinessScore} calibrationSeconds={calibrationSeconds} />

          <article className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <SessionTimer />
          </article>

          <article className="rounded-card bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <TopicProgressBar topicName={currentTopic || "Newton's Laws"} subject={currentSubject || "Physics"} subjectColor={subjectColor} percent={45} />
          </article>

          <article className="rounded-card bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <label htmlFor="session-notes" className="mb-2 block text-sm font-medium text-navy dark:text-white">
              Session Notes
            </label>
            <textarea
              id="session-notes"
              value={sessionNotes}
              onChange={(event) => appendNote(event.target.value)}
              placeholder="Type your notes here…"
              className="min-h-[100px] w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition hover:border-gray-400 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/35 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </article>

          <div className="mt-auto flex flex-wrap gap-3">
            {isPaused ? (
              <button
                type="button"
                onClick={() => {
                  void resumeSession();
                  setAlertLevel(0);
                }}
                className="inline-flex items-center gap-2 rounded-btn border border-[#E8612C] px-4 py-2 text-sm font-semibold text-[#E8612C] transition hover:bg-[#E8612C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8612C]"
              >
                <PauseCircle size={16} />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void pauseSession();
                  setAlertLevel(4);
                }}
                className="inline-flex items-center gap-2 rounded-btn border border-[#E8612C] px-4 py-2 text-sm font-semibold text-[#E8612C] transition hover:bg-[#E8612C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8612C]"
              >
                <PauseCircle size={16} />
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setBreakOpen(true);
                setBreakSeconds(300);
                void pauseSession();
                setAlertLevel(0);
              }}
              className="inline-flex items-center gap-2 rounded-btn border border-purple px-4 py-2 text-sm font-semibold text-purple transition hover:bg-purple/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple"
            >
              <Coffee size={16} />
              5-min Break
            </button>

            <button
              type="button"
              onClick={() => setConfirmEndOpen(true)}
              className="inline-flex items-center gap-2 rounded-btn bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <StopCircle size={16} />
              End Session
            </button>
          </div>
        </div>
      </div>

      {breakOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card bg-white p-8 text-center dark:bg-gray-900">
            <h3 className="font-display text-3xl text-navy dark:text-white">Break Time</h3>
            <p className="mt-4 font-mono text-5xl font-bold text-cyan">
              {Math.floor(breakSeconds / 60)}:{pad(breakSeconds % 60)}
            </p>
            <button
              type="button"
              onClick={() => {
                setBreakOpen(false);
                void resumeSession();
              }}
              className="mt-6 w-full rounded-btn bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              Resume Early
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        title="End session?"
        description="Your current session summary will be saved."
        confirmLabel="End Session"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmEndOpen(false);
          void endSession();
          navigate("/reports");
        }}
      />

      <ConfirmModal
        open={leaveConfirmOpen}
        onOpenChange={(open) => {
          setLeaveConfirmOpen(open);
          if (!open) {
            setPendingPath(null);
          }
        }}
        title="Your session is still active!"
        description="Leaving will end your current session. Your progress will be saved."
        confirmLabel="End & Leave"
        cancelLabel="Stay in Session"
        confirmVariant="danger"
        onConfirm={() => {
          void endSession();
          setLeaveConfirmOpen(false);
          if (pendingPath === "__BACK__") {
            navigate(-1);
          } else if (pendingPath) {
            navigate(pendingPath);
          }
          setPendingPath(null);
        }}
      />

      <AlertOverlay />

      <QuickStartModal open={startModalOpen} onOpenChange={setStartModalOpen} />
    </section>
  );
}
