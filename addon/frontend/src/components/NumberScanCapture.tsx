import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

interface Props {
  /** Called with the parsed set code (best-effort) and card number. */
  onResult: (r: { set: string; number: string; rawText: string }) => void;
  onClose: () => void;
}

// Fraction of the raw video frame that is cropped for OCR (centered). Kept a
// bit larger than the on-screen guide box so the number stays inside even with
// object-cover scaling.
const CROP_W = 0.86;
const CROP_H = 0.24;

type Phase = "camera" | "reading" | "result" | "error";

interface OcrResult {
  rawText: string;
  set: string;
  number: string;
  preview: string; // data URL of the preprocessed crop
}

/**
 * Parses OCR text looking for a Pokémon collector number ("126/167" or "126")
 * and, best-effort, a 2–4 letter printed set code (e.g. "TWM").
 */
function parseOcr(text: string): { set: string; number: string } {
  const up = text.toUpperCase();
  let number = "";
  const frac = up.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (frac) {
    number = `${frac[1]}/${frac[2]}`;
  } else {
    const single = up.match(/\d{1,3}/);
    if (single) number = single[0];
  }
  const setM = up.match(/\b[A-Z]{2,4}\b/);
  return { set: setM ? setM[0] : "", number };
}

/**
 * Preprocesses a cropped frame in-place to help OCR: grayscale + simple
 * adaptive-ish threshold based on the mean luminance.
 */
function preprocess(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lum[p] = g;
    sum += g;
  }
  const mean = sum / (w * h);
  const threshold = mean * 0.9; // slightly below mean to keep dark glyphs
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = lum[p] > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Live-camera "scan number" mode. The user frames the card's collector number
 * inside the guide box; on capture the region is OCR'd locally (Tesseract.js,
 * WASM — no network for the recognition itself, only the one-time model
 * download) and the parsed set/number are returned to the caller.
 */
export default function NumberScanCapture({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("camera");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OcrResult | null>(null);

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
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setErrorMsg(
            "Impossibile accedere alla fotocamera. Controlla i permessi dell'app.",
          );
          setPhase("error");
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

  async function capture() {
    const video = videoRef.current;
    if (!video || !ready || phase === "reading") return;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const cropW = Math.round(vw * CROP_W);
    const cropH = Math.round(vh * CROP_H);
    const sx = Math.round((vw - cropW) / 2);
    const sy = Math.round((vh - cropH) / 2);

    // Upscale 2x onto the OCR canvas for sharper glyphs.
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = cropW * scale;
    canvas.height = cropH * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      video,
      sx,
      sy,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    preprocess(ctx, canvas.width, canvas.height);

    setPhase("reading");
    setProgress(0);
    try {
      const worker = await createWorker("eng", undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(m.progress);
        },
      });
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
      });
      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      const parsed = parseOcr(data.text);
      setResult({
        rawText: data.text.trim(),
        set: parsed.set,
        number: parsed.number,
        preview: canvas.toDataURL("image/png"),
      });
      setPhase("result");
    } catch {
      setErrorMsg("Errore durante la lettura OCR. Riprova.");
      setPhase("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {phase === "error" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
          <p className="text-white text-sm leading-relaxed">{errorMsg}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setErrorMsg(null);
                setPhase("camera");
              }}
              className="px-6 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-semibold touch-manipulation"
            >
              Riprova
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-white/20 text-white rounded-xl text-sm font-semibold touch-manipulation"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {phase !== "error" && (
        <>
          <video
            ref={videoRef}
            className="flex-1 w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Guide box overlay */}
          {phase === "camera" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="border-2 border-pokemon-yellow rounded-lg"
                style={{ width: "84%", height: "20%" }}
              />
            </div>
          )}

          {/* Instructions */}
          {phase === "camera" && (
            <div className="absolute top-16 left-0 right-0 px-6 text-center pointer-events-none">
              <p className="text-white text-sm bg-black/40 rounded-full py-2 px-4 inline-block">
                Inquadra il numero della carta (es. 126/167) nel riquadro
              </p>
            </div>
          )}

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Reading overlay */}
          {phase === "reading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <div className="w-10 h-10 border-4 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">
                Lettura numero… {Math.round(progress * 100)}%
              </p>
            </div>
          )}

          {/* Result / debug panel */}
          {phase === "result" && result && (
            <div className="absolute inset-0 bg-black/80 flex items-start justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-md mt-4 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Risultato lettura
                </h2>

                {/* Preprocessed crop preview */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    Ritaglio analizzato (dopo pre-elaborazione)
                  </p>
                  <img
                    src={result.preview}
                    alt="Ritaglio OCR"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100"
                  />
                </div>

                {/* Parsed values */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-900 px-3 py-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Serie
                    </p>
                    <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {result.set || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-900 px-3 py-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Numero
                    </p>
                    <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {result.number || "—"}
                    </p>
                  </div>
                </div>

                {/* Raw OCR text */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    Testo grezzo OCR
                  </p>
                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 dark:bg-gray-900 px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-200">
                    {result.rawText || "(vuoto)"}
                  </pre>
                </div>

                {!result.number && (
                  <p className="text-xs text-pokemon-red">
                    Numero non riconosciuto: riprova avvicinandoti, con più luce
                    e centrando il numero nel riquadro.
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setPhase("camera");
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 touch-manipulation"
                  >
                    Riprova
                  </button>
                  <button
                    type="button"
                    disabled={!result.number}
                    onClick={() => {
                      stopStream();
                      onResult({
                        set: result.set,
                        number: result.number,
                        rawText: result.rawText,
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-pokemon-blue text-white disabled:opacity-40 touch-manipulation"
                  >
                    Usa questi dati
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center touch-manipulation"
            aria-label="Chiudi"
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

          {/* Shutter */}
          {phase === "camera" && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
              <button
                onClick={() => void capture()}
                disabled={!ready}
                className="w-20 h-20 rounded-full bg-white border-[5px] border-gray-300 disabled:opacity-40 touch-manipulation active:scale-90 transition-transform shadow-lg"
                aria-label="Leggi numero"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
