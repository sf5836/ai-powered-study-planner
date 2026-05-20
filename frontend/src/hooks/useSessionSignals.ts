import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useSessionStore } from "../stores/sessionStore";

type FaceDetection = {
  boundingBox: { x: number; y: number; width: number; height: number };
};

type FaceDetectorLike = {
  detect: (input: HTMLVideoElement) => Promise<FaceDetection[]>;
};

function createDetector(): FaceDetectorLike | null {
  const FaceDetectorApi = (window as { FaceDetector?: new (options: { maxDetectedFaces?: number }) => FaceDetectorLike })
    .FaceDetector;
  if (!FaceDetectorApi) {
    return null;
  }

  try {
    return new FaceDetectorApi({ maxDetectedFaces: 1 });
  } catch {
    return null;
  }
}

type UseSessionSignalsOptions = {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  isPaused: boolean;
  intervalMs?: number;
};

export function useSessionSignals({ videoRef, isActive, isPaused, intervalMs = 1200 }: UseSessionSignalsOptions): void {
  const updateGestureFlags = useSessionStore((state) => state.updateGestureFlags);
  const detectorRef = useRef<FaceDetectorLike | null>(null);
  const fallbackUsed = useRef(false);

  const detector = useMemo(() => createDetector(), []);

  useEffect(() => {
    detectorRef.current = detector;
  }, [detector]);

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        return;
      }

      const detectorInstance = detectorRef.current;
      if (!detectorInstance) {
        if (!fallbackUsed.current) {
          fallbackUsed.current = true;
          updateGestureFlags({ lookingAway: false, slouching: false, yawning: false, phoneDetected: false });
        }
        return;
      }

      try {
        const [face] = await detectorInstance.detect(video);
        if (!face) {
          updateGestureFlags({ lookingAway: true, slouching: false, yawning: false, phoneDetected: false });
          return;
        }

        const { x, width, height } = face.boundingBox;
        const videoWidth = Math.max(1, video.videoWidth || 1);
        const videoHeight = Math.max(1, video.videoHeight || 1);
        const centerX = x + width / 2;
        const centerRatio = centerX / videoWidth;
        const sizeRatio = height / videoHeight;

        updateGestureFlags({
          lookingAway: centerRatio < 0.2 || centerRatio > 0.8,
          slouching: sizeRatio < 0.28,
          yawning: false,
          phoneDetected: false,
        });
      } catch {
        updateGestureFlags({ lookingAway: false, slouching: false, yawning: false, phoneDetected: false });
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, isActive, isPaused, updateGestureFlags, videoRef]);
}
