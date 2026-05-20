import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { FaceMesh } from "@mediapipe/face_mesh";
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

type FaceMeshResult = {
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
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
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const resultRef = useRef<FaceDetectionResult | null>(null);
  const faceMeshResultRef = useRef<FaceMeshResult | null>(null);
  const inFlightRef = useRef(false);
  const faceMeshInFlightRef = useRef(false);
  const phoneInFlightRef = useRef(false);
  const phoneModelRef = useRef<import("@tensorflow-models/coco-ssd").ObjectDetection | null>(null);
  const lastPhoneCheckRef = useRef(0);
  const phoneDetectedUntilRef = useRef(0);
  const lastFaceMeshCheckRef = useRef(0);
  const missingFaceCountRef = useRef(0);
  const presentFaceCountRef = useRef(0);
  const yawningCountRef = useRef(0);
  const headTurnCountRef = useRef(0);
  const eyesClosedCountRef = useRef(0);

  const resolveAssetBase = async (localPath: string, localBase: string, cdnBase: string) => {
    try {
      const response = await fetch(localPath, { method: "HEAD" });
      if (response.ok) {
        return localBase;
      }
    } catch {
      // Ignore and fall back to CDN.
    }
    return cdnBase;
  };

  const ensurePhoneModel = async () => {
    if (phoneModelRef.current) {
      return phoneModelRef.current;
    }

    const tfCore = await import("@tensorflow/tfjs-core");
    await import("@tensorflow/tfjs-backend-webgl");
    await tfCore.setBackend("webgl");
    await tfCore.ready();

    const coco = await import("@tensorflow-models/coco-ssd");
    const model = await coco.load({ base: "lite_mobilenet_v2" });
    phoneModelRef.current = model;
    return model;
  };

  useEffect(() => {
    let cancelled = false;

    const updateAvailability = () => {
      setGestureAvailable(Boolean(detectorRef.current || faceMeshRef.current));
    };

    const initDetector = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const localBase = new URL("mediapipe/face_detection/", window.location.origin + baseUrl).toString();
        const assetBase = await resolveAssetBase(
          `${localBase}face_detection.js`,
          localBase,
          "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/"
        );
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
        updateAvailability();
      } catch {
        if (!cancelled) {
          detectorRef.current = null;
          updateAvailability();
        }
      }
    };

    const initFaceMesh = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const localBase = new URL("mediapipe/face_mesh/", window.location.origin + baseUrl).toString();
        const assetBase = await resolveAssetBase(
          `${localBase}face_mesh.js`,
          localBase,
          "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/"
        );
        const mesh = new FaceMesh({
          locateFile: (file) => `${assetBase}${file}`,
        });

        mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        mesh.onResults((results) => {
          faceMeshResultRef.current = results as FaceMeshResult;
        });

        if (cancelled) {
          mesh.close();
          return;
        }

        faceMeshRef.current = mesh;
        updateAvailability();
      } catch {
        if (!cancelled) {
          faceMeshRef.current = null;
          updateAvailability();
        }
      }
    };

    initDetector();
    initFaceMesh();

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      faceMeshRef.current?.close();
      detectorRef.current = null;
      faceMeshRef.current = null;
      resultRef.current = null;
      faceMeshResultRef.current = null;
      inFlightRef.current = false;
      faceMeshInFlightRef.current = false;
      phoneInFlightRef.current = false;
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
        const headTurn = !facePresent
          ? "unknown"
          : centerRatio < 0.4
            ? "left"
            : centerRatio > 0.6
              ? "right"
              : "center";
        if (headTurn === "left" || headTurn === "right") {
          headTurnCountRef.current += 1;
        } else {
          headTurnCountRef.current = 0;
        }

        const lookingAway =
          missingFaceCountRef.current >= 3 ||
          (facePresent && headTurnCountRef.current >= 3) ||
          (facePresent && (centerRatio < 0.3 || centerRatio > 0.7));
        const slouching = sizeRatio > 0 && sizeRatio < 0.28;
        const distance = !facePresent
          ? "unknown"
          : sizeRatio > 0.45
            ? "near"
            : sizeRatio < 0.25
              ? "far"
              : "ok";

        let yawning = false;
        let eyesClosed = false;
        const mesh = faceMeshRef.current;
        const now = Date.now();
        if (mesh && !faceMeshInFlightRef.current && now - lastFaceMeshCheckRef.current > 700) {
          faceMeshInFlightRef.current = true;
          lastFaceMeshCheckRef.current = now;
          try {
            await mesh.send({ image: video });
            const meshLandmarks = faceMeshResultRef.current?.multiFaceLandmarks?.[0];
            if (meshLandmarks && meshLandmarks.length > 0) {
              const upper = meshLandmarks[13];
              const lower = meshLandmarks[14];
              const left = meshLandmarks[78];
              const right = meshLandmarks[308];
              const mouthOpen = Math.abs(lower.y - upper.y);
              const mouthWidth = Math.abs(right.x - left.x);
              const ratio = mouthWidth > 0 ? mouthOpen / mouthWidth : 0;
              yawning = ratio > 0.32;

              const lUpper = meshLandmarks[159];
              const lLower = meshLandmarks[145];
              const lOuter = meshLandmarks[33];
              const lInner = meshLandmarks[133];
              const rUpper = meshLandmarks[386];
              const rLower = meshLandmarks[374];
              const rOuter = meshLandmarks[362];
              const rInner = meshLandmarks[263];

              const lEyeOpen = Math.abs(lLower.y - lUpper.y);
              const lEyeWidth = Math.abs(lInner.x - lOuter.x);
              const rEyeOpen = Math.abs(rLower.y - rUpper.y);
              const rEyeWidth = Math.abs(rInner.x - rOuter.x);
              const lRatio = lEyeWidth > 0 ? lEyeOpen / lEyeWidth : 1;
              const rRatio = rEyeWidth > 0 ? rEyeOpen / rEyeWidth : 1;
              const eyeRatio = (lRatio + rRatio) / 2;
              eyesClosed = eyeRatio < 0.2;
            }
          } catch {
            yawning = false;
            eyesClosed = false;
          } finally {
            faceMeshInFlightRef.current = false;
          }
        }

        if (yawning) {
          yawningCountRef.current += 1;
        } else {
          yawningCountRef.current = 0;
        }

        if (eyesClosed) {
          eyesClosedCountRef.current += 1;
        } else {
          eyesClosedCountRef.current = 0;
        }

        let phoneDetected = Date.now() < phoneDetectedUntilRef.current;
        if (now - lastPhoneCheckRef.current > 1800 && !phoneInFlightRef.current) {
          phoneInFlightRef.current = true;
          lastPhoneCheckRef.current = now;
          try {
            const model = await ensurePhoneModel();
            const predictions = await model.detect(video);
            phoneDetected = predictions.some((prediction) => prediction.class === "cell phone" && prediction.score >= 0.55);
            if (phoneDetected) {
              phoneDetectedUntilRef.current = Date.now() + 2500;
            }
          } catch {
            phoneDetected = false;
          } finally {
            phoneInFlightRef.current = false;
          }
        }

        updateGestureFlags({
          lookingAway,
          slouching,
          yawning: yawningCountRef.current >= 2,
          phoneDetected,
          eyesClosed: eyesClosedCountRef.current >= 2,
        });

        const timestamp = useSessionStore.getState().elapsedSeconds;
        addGestureSample({
          timestamp,
          lookingAway,
          slouching,
          yawning: yawningCountRef.current >= 2,
          phoneDetected,
          eyesClosed: eyesClosedCountRef.current >= 2,
          facePresent,
          headTurn,
          distance,
        });
      } catch {
        yawningCountRef.current = 0;
        eyesClosedCountRef.current = 0;
        updateGestureFlags({ lookingAway: false, slouching: false, yawning: false, phoneDetected: false, eyesClosed: false });
      } finally {
        inFlightRef.current = false;
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [addGestureSample, intervalMs, isActive, isPaused, updateGestureFlags, videoRef]);
}
