import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { useSessionStore } from "../stores/sessionStore";

type FaceDetectionBox = {
  xCenter?: number;
  yCenter?: number;
  width?: number;
  height?: number;
};

type FaceDetectionResult = {
  detections: Array<{ boundingBox?: FaceDetectionBox }>;
};

type UseSessionSignalsOptions = {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  isPaused: boolean;
  intervalMs?: number;
};

export function useSessionSignals({ videoRef, isActive, isPaused, intervalMs = 1200 }: UseSessionSignalsOptions): void {
  const updateGestureFlags = useSessionStore((state) => state.updateGestureFlags);
  const setGestureAvailable = useSessionStore((state) => state.setGestureAvailable);
  const detectorRef = useRef<FaceDetection | null>(null);
  const resultRef = useRef<FaceDetectionResult | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const initDetector = async () => {
      try {
        const detector = new FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        });

        detector.setOptions({
          model: "short",
          minDetectionConfidence: 0.5,
        });

        detector.onResults((results) => {
          resultRef.current = results as FaceDetectionResult;
        });

        if (cancelled) {
          detector.close();
          return;
        }

        detectorRef.current = detector;
        setGestureAvailable(true);
      } catch {
        if (!cancelled) {
          detectorRef.current = null;
          setGestureAvailable(false);
        }
      }
    };

    initDetector();

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
      resultRef.current = null;
      inFlightRef.current = false;
    };
  }, [setGestureAvailable]);

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        return;
      }

      const detector = detectorRef.current;
      if (!detector) {
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        await detector.send({ image: video });
        const detections = resultRef.current?.detections ?? [];
        const box = detections[0]?.boundingBox;
        if (!box) {
          updateGestureFlags({ lookingAway: true, slouching: false, yawning: false, phoneDetected: false });
          return;
        }

        const videoWidth = Math.max(1, video.videoWidth || 1);
        const videoHeight = Math.max(1, video.videoHeight || 1);
        const xCenter = Number(box.xCenter || 0);
        const width = Number(box.width || 0);
        const height = Number(box.height || 0);
        const isNormalized = xCenter <= 1 && width <= 1 && height <= 1;
        const centerRatio = isNormalized ? xCenter : xCenter / videoWidth;
        const sizeRatio = isNormalized ? height : height / videoHeight;

        updateGestureFlags({
          lookingAway: centerRatio < 0.2 || centerRatio > 0.8,
          slouching: sizeRatio < 0.28,
          yawning: false,
          phoneDetected: false,
        });
      } catch {
        updateGestureFlags({ lookingAway: false, slouching: false, yawning: false, phoneDetected: false });
      } finally {
        inFlightRef.current = false;
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, isActive, isPaused, updateGestureFlags, videoRef]);
}
