import * as Switch from "@radix-ui/react-switch";
import {
  Bell,
  Camera,
  Download,
  Monitor,
  Moon,
  Palette,
  Play,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  UserCircle,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useAuthStore } from "../store/authStore";
import { usePlannerStore } from "../stores/plannerStore";
import { useSessionStore } from "../stores/sessionStore";
import { useSessionsStore } from "../stores/sessionsStore";
import { useUserStore } from "../stores/userStore";

type AlertSensitivity = "low" | "medium" | "high";
type ThemeMode = "light" | "dark" | "system";
type ResolutionOption = "480p" | "720p" | "1080p";

const sensitivityOptions: AlertSensitivity[] = ["low", "medium", "high"];

function toInitials(name: string): string {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function normalizeSessionLength(value: number): number {
  return Math.max(15, Math.min(120, value));
}

function normalizeBreakInterval(value: number): number {
  return Math.max(20, Math.min(60, value));
}

export default function SettingsPage() {
  const navigate = useNavigate();

  const {
    name,
    email,
    avatarUrl,
    alertSensitivity,
    defaultSessionLength,
    breakInterval,
    pushNotifications,
    preSessionReminder,
    reminderTime,
    streakReminder,
    theme,
    setName,
    setEmail,
    setAvatarUrl,
    setAlertSensitivity,
    setDefaultSessionLength,
    setBreakInterval,
    setPushNotifications,
    setPreSessionReminder,
    setReminderTime,
    setStreakReminder,
    setTheme,
    reset,
  } = useUserStore(
    useShallow((state) => ({
      name: state.name,
      email: state.email,
      avatarUrl: state.avatarUrl,
      alertSensitivity: state.alertSensitivity,
      defaultSessionLength: state.defaultSessionLength,
      breakInterval: state.breakInterval,
      pushNotifications: state.pushNotifications,
      preSessionReminder: state.preSessionReminder,
      reminderTime: state.reminderTime,
      streakReminder: state.streakReminder,
      theme: state.theme,
      setName: state.setName,
      setEmail: state.setEmail,
      setAvatarUrl: state.setAvatarUrl,
      setAlertSensitivity: state.setAlertSensitivity,
      setDefaultSessionLength: state.setDefaultSessionLength,
      setBreakInterval: state.setBreakInterval,
      setPushNotifications: state.setPushNotifications,
      setPreSessionReminder: state.setPreSessionReminder,
      setReminderTime: state.setReminderTime,
      setStreakReminder: state.setStreakReminder,
      setTheme: state.setTheme,
      reset: state.reset,
    }))
  );

  const logout = useAuthStore((state) => state.logout);
  const { records, clearAll } = useSessionsStore(
    useShallow((state) => ({
      records: state.records,
      clearAll: state.clearAll,
    }))
  );

  const [profileName, setProfileName] = useState(name);
  const [profileEmail, setProfileEmail] = useState(email);
  const [saved, setSaved] = useState(false);

  const [resolution, setResolution] = useState<ResolutionOption>("720p");
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setProfileName(name);
  }, [name]);

  useEffect(() => {
    setProfileEmail(email);
  }, [email]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const avatarInitials = useMemo(() => toInitials(profileName || name), [name, profileName]);

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    setName(profileName.trim() || "User");
    setEmail(profileEmail.trim());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const stopPreview = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setPreviewOpen(false);
    setCountdown(10);
  };

  const testWebcam = async () => {
    stopPreview();
    setWebcamError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setPreviewOpen(true);
      setCountdown(10);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      closeTimeoutRef.current = window.setTimeout(() => {
        stopPreview();
      }, 10000);
    } catch {
      setWebcamError("Webcam permission denied or unavailable.");
    }
  };

  const applyTheme = (mode: ThemeMode) => {
    setTheme(mode);
  };

  const exportData = () => {
    const data = {
      sessions: records,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "focusiq-export.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const deleteEverything = () => {
    localStorage.clear();

    usePlannerStore.setState({ sessions: [], subjects: [], error: null, isLoading: false });
    clearAll();
    useSessionStore.setState({
      isActive: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentSubject: "",
      currentTopic: "",
      focusScore: 70,
      studyReadinessScore: 0,
      currentEmotion: "neutral",
      alertLevel: 0,
      gestureFlags: {
        lookingAway: false,
        yawning: false,
        slouching: false,
        phoneDetected: false,
      },
      focusHistory: [],
      emotionHistory: [],
      sessionNotes: "",
      calibrationSeconds: 0,
    });

    reset();
    void logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <UserCircle size={18} />
            Profile
          </h3>
        </header>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-navy text-2xl font-bold text-white">
            {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : avatarInitials}
          </div>

          <div>
            <button
              type="button"
              onClick={triggerAvatarUpload}
              className="inline-flex items-center gap-2 rounded-btn border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <Camera size={15} />
              Upload photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input
              type="email"
              value={profileEmail}
              onChange={(event) => setProfileEmail(event.target.value)}
              className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && <span className="text-sm font-semibold text-emerald-500">Saved ✓</span>}
          <button
            type="button"
            onClick={saveProfile}
            className="rounded-btn bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Save changes
          </button>
        </div>
      </article>

      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <SlidersHorizontal size={18} />
            Session Preferences
          </h3>
        </header>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Default Session Length</label>
              <span className="text-sm text-gray-500 dark:text-gray-300">{defaultSessionLength} min</span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={defaultSessionLength}
              onChange={(event) => setDefaultSessionLength(normalizeSessionLength(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-cyan"
            />
            <div className="mt-2 grid grid-cols-6 text-[11px] text-gray-400 dark:text-gray-400">
              <span>15m</span>
              <span className="text-center">30m</span>
              <span className="text-center">45m</span>
              <span className="text-center">1h</span>
              <span className="text-center">1.5h</span>
              <span className="text-right">2h</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Break Interval</label>
              <span className="text-sm text-gray-500 dark:text-gray-300">{breakInterval} min</span>
            </div>
            <input
              type="range"
              min={20}
              max={60}
              step={5}
              value={breakInterval}
              onChange={(event) => setBreakInterval(normalizeBreakInterval(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-cyan"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Alert Sensitivity</p>
            <div className="inline-flex rounded-btn">
              {sensitivityOptions.map((option) => {
                const selected = alertSensitivity === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAlertSensitivity(option)}
                    className={[
                      "border px-4 py-2 text-sm font-semibold capitalize",
                      selected
                        ? "border-cyan bg-cyan text-white"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <Bell size={18} />
            Notifications
          </h3>
        </header>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-200">Web push notifications</p>
            <Switch.Root
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
              className="relative h-6 w-11 rounded-full bg-gray-300 transition data-[state=checked]:bg-cyan"
            >
              <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700 dark:text-gray-200">Pre-session reminder</p>
              <Switch.Root
                checked={preSessionReminder}
                onCheckedChange={setPreSessionReminder}
                className="relative h-6 w-11 rounded-full bg-gray-300 transition data-[state=checked]:bg-cyan"
              >
                <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div
              className={[
                "overflow-hidden transition-all duration-300",
                preSessionReminder ? "mt-3 max-h-16 opacity-100" : "max-h-0 opacity-0",
              ].join(" ")}
            >
              <input
                type="time"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
                className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-200">Daily streak reminder</p>
            <Switch.Root
              checked={streakReminder}
              onCheckedChange={setStreakReminder}
              className="relative h-6 w-11 rounded-full bg-gray-300 transition data-[state=checked]:bg-cyan"
            >
              <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
        </div>
      </article>

      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <Camera size={18} />
            Webcam
          </h3>
        </header>

        <button
          type="button"
          onClick={testWebcam}
          className="inline-flex items-center gap-2 rounded-btn border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <Play size={15} />
          Test Webcam
        </button>

        {webcamError && <p className="mt-3 text-sm text-red-500">{webcamError}</p>}

        {previewOpen && (
          <div className="relative mt-4 w-[240px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full bg-black object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">Live Preview</span>
            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">Closing in {countdown}s</span>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Recording resolution</label>
          <select
            value={resolution}
            onChange={(event) => setResolution(event.target.value as ResolutionOption)}
            className="w-full rounded-btn border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="480p">480p - Faster</option>
            <option value="720p">720p - Recommended</option>
            <option value="1080p">1080p - High quality</option>
          </select>
        </div>
      </article>

      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <Palette size={18} />
            Appearance
          </h3>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "light" as ThemeMode, label: "Light", icon: Sun },
            { key: "dark" as ThemeMode, label: "Dark", icon: Moon },
            { key: "system" as ThemeMode, label: "System", icon: Monitor },
          ].map((mode) => {
            const Icon = mode.icon;
            const selected = theme === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => applyTheme(mode.key)}
                className={[
                  "rounded-card border p-4 text-center transition",
                  selected
                    ? "border-2 border-[#00C2CB] bg-cyan-50 dark:bg-cyan-900/20"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700",
                ].join(" ")}
              >
                <Icon size={32} className="mx-auto mb-2 text-navy dark:text-white" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{mode.label}</p>
              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-card bg-white p-6 shadow-sm dark:bg-gray-800">
        <header className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="inline-flex items-center gap-2 text-base font-bold text-navy dark:text-white">
            <Shield size={18} />
            Privacy & Data
          </h3>
        </header>

        <p className="text-sm text-gray-500 dark:text-gray-300">
          FocusIQ never stores raw video footage. Only anonymized focus metrics are saved locally in your browser.
        </p>

        <button
          type="button"
          onClick={exportData}
          className="mt-4 inline-flex items-center gap-2 rounded-btn border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <Download size={15} />
          Export my data
        </button>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="mt-2 inline-flex items-center gap-2 rounded-btn border border-red-500 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={15} />
          Delete all my data
        </button>

        <ConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete all data?"
          description="This will permanently delete all your sessions, planner data, and settings. This cannot be undone."
          confirmLabel="Yes, delete everything"
          confirmVariant="danger"
          onConfirm={deleteEverything}
        />
      </article>
    </section>
  );
}
