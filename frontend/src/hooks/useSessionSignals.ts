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
  const addGestureSample = useSessionStore((state) => state.addGestureSample);
  const detectorRef = useRef<FaceDetection | null>(null);
  const resultRef = useRef<FaceDetectionResult | null>(null);
  const inFlightRef = useRef(false);
  const missingFaceCountRef = useRef(0);
  const presentFaceCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const initDetector = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const assetBase = `${baseUrl}mediapipe/face_detection/`;
        const detector = new FaceDetection({
          locateFile: (file) => `${assetBase}${file}`,
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
        const facePresent = Boolean(box);
        if (!facePresent) {
          missingFaceCountRef.current += 1;
          presentFaceCountRef.current = 0;
        } else {
          presentFaceCountRef.current += 1;
          missingFaceCountRef.current = 0;
        }

        const videoWidth = Math.max(1, video.videoWidth || 1);
        const videoHeight = Math.max(1, video.videoHeight || 1);
        const xCenter = Number(box?.xCenter || 0);
        const width = Number(box?.width || 0);
        const height = Number(box?.height || 0);
        const isNormalized = facePresent && xCenter <= 1 && width <= 1 && height <= 1;
        const centerRatio = facePresent ? (isNormalized ? xCenter : xCenter / videoWidth) : 0.5;
        const sizeRatio = facePresent ? (isNormalized ? height : height / videoHeight) : 0;
        const lookingAway = missingFaceCountRef.current >= 2 || centerRatio < 0.2 || centerRatio > 0.8;
        const slouching = sizeRatio > 0 && sizeRatio < 0.28;
        const headTurn = !facePresent
          ? "unknown"
          : centerRatio < 0.35
            ? "left"
            : centerRatio > 0.65
              ? "right"
              : "center";
        const distance = !facePresent
          ? "unknown"
          : sizeRatio > 0.45
            ? "near"
            : sizeRatio < 0.25
              ? "far"
              : "ok";

        updateGestureFlags({
          lookingAway,
          slouching,
          yawning: false,
          phoneDetected: false,
        });

        const timestamp = useSessionStore.getState().elapsedSeconds;
        addGestureSample({
          timestamp,
          lookingAway,
          slouching,
          yawning: false,
          phoneDetected: false,
          facePresent,
          headTurn,
          distance,
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
  }, [addGestureSample, intervalMs, isActive, isPaused, updateGestureFlags, videoRef]);
}
