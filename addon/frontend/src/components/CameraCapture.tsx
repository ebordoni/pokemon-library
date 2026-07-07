import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Fullscreen camera overlay using getUserMedia.
 * Avoids the inconsistent behaviour of <input capture="environment"> on Android WebView.
 */
export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // playsInline is essential on iOS to avoid fullscreen takeover
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Impossibile accedere alla fotocamera. Controlla i permessi dell'app.",
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <p className="text-white text-sm leading-relaxed">{error}</p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-semibold touch-manipulation"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Video stream */}
      {!error && (
        <>
          <video
            ref={videoRef}
            className="flex-1 w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Loading overlay */}
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center touch-manipulation"
            aria-label="Chiudi fotocamera"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Shutter button */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
            <button
              onClick={capture}
              disabled={!ready}
              className="w-20 h-20 rounded-full bg-white border-[5px] border-gray-300 disabled:opacity-40 touch-manipulation active:scale-90 transition-transform shadow-lg"
              aria-label="Scatta foto"
            />
          </div>
        </>
      )}
    </div>
  );
}
