import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type UseWebcamResult = {
  videoRef: RefObject<HTMLVideoElement>;
  isPermitted: boolean;
  isLoading: boolean;
  error: string | null;
  stopWebcam: () => void;
};

export function useWebcam(): UseWebcamResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isPermitted, setIsPermitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsPermitted(true);
      } catch (caughtError) {
        const err = caughtError as DOMException;
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow webcam access.");
        } else if (err.name === "NotFoundError") {
          setError("No camera device found. Please connect a webcam.");
        } else {
          setError("Unable to access webcam right now.");
        }
        setIsPermitted(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      stopWebcam();
    };
  }, [stopWebcam]);

  return { videoRef, isPermitted, isLoading, error, stopWebcam };
}
