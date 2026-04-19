import { useEffect, useRef } from "react";
import { useSessionStore } from "../stores/sessionStore";

type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DetectedFace = {
  boundingBox: FaceBounds;
};

type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect: (input: HTMLVideoElement) => Promise<DetectedFace[]>;
};

declare global {
  interface Window {
    FaceDetector?: FaceDetectorCtor;
  }
}

type UseSessionSignalsArgs = {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  isPaused: boolean;
  isPermitted: boolean;
};

export function useSessionSignals({ videoRef, isActive, isPaused, isPermitted }: UseSessionSignalsArgs): void {
  const detectorRef = useRef<InstanceType<FaceDetectorCtor> | null>(null);

  useEffect(() => {
    const canRun = isActive && !isPaused && isPermitted;
    if (!canRun) {
      return;
    }

    if (!window.FaceDetector) {
      return;
    }

    if (!detectorRef.current) {
      detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    }

    let cancelled = false;

    const loop = window.setInterval(async () => {
      if (cancelled) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        const faces = await detectorRef.current?.detect(video);
        if (!faces || faces.length === 0) {
          useSessionStore.getState().updateGestureFlags({
            lookingAway: true,
          });
          return;
        }

        const face = faces[0];
        const centerX = face.boundingBox.x + face.boundingBox.width / 2;
        const centerY = face.boundingBox.y + face.boundingBox.height / 2;

        const normalizedX = centerX / video.videoWidth;
        const normalizedY = centerY / video.videoHeight;

        const lookingAway = normalizedX < 0.25 || normalizedX > 0.75;
        const slouching = normalizedY > 0.68;

        useSessionStore.getState().updateGestureFlags({
          lookingAway,
          slouching,
        });
      } catch {
        // Keep session running even if face detection fails intermittently.
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(loop);
    };
  }, [isActive, isPaused, isPermitted, videoRef]);
}
