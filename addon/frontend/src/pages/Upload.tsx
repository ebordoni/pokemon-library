import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import CameraCapture from "../components/CameraCapture";
import ManualEntry from "../components/ManualEntry";
import ScanReview from "../components/ScanReview";
import ThemeToggle from "../components/ThemeToggle";
import { useScanStatus } from "../hooks/useScanStatus";
import type { ScanStatusResponse } from "../types";

type Stage = "idle" | "uploading" | "polling" | "review" | "error";

export default function Upload() {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queuePos, setQueuePos] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scanStatus = useScanStatus(stage === "polling" ? sessionId : null);
  const [finalResult, setFinalResult] = useState<ScanStatusResponse | null>(
    null,
  );

  // Transition out of polling when scan reaches a terminal state
  useEffect(() => {
    if (!scanStatus || stage !== "polling") return;
    const s = scanStatus.session.status;
    if (s === "completed") {
      setFinalResult(scanStatus);
      setStage("review");
    }
    if (s === "error") {
      setErrorMsg(scanStatus.session.errorMessage ?? "Scansione fallita");
      setStage("error");
    }
    if (scanStatus.queuePosition !== undefined) {
      setQueuePos(scanStatus.queuePosition);
    }
  }, [scanStatus, stage]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Seleziona un file immagine");
      setStage("error");
      return;
    }
    setStage("uploading");
    setErrorMsg(null);
    try {
      const { data } = await api.scanImage(file);
      setSessionId(data.sessionId);
      setQueuePos(data.queuePosition);
      setStage("polling");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Caricamento fallito — controlla la connessione e riprova";
      setErrorMsg(msg);
      setStage("error");
    }
  }, []);

  function reset() {
    setStage("idle");
    setSessionId(null);
    setErrorMsg(null);
    setIsDragging(false);
    setFinalResult(null);
    setShowCamera(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  const processingMsg =
    scanStatus?.session.status === "processing"
      ? "Identificazione carte con AI…"
      : queuePos > 1
        ? `In coda (posizione ${queuePos})…`
        : "Avvio scansione…";

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Aggiungi Carte
        </h1>
        <ThemeToggle />
      </div>

      {/* Overlay fotocamera (getUserMedia) */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setShowCamera(false);
            void handleFile(file);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* ── IDLE ─────────────────────────────────────────────────────── */}
      {stage === "idle" && (
        <>
          {/* Input libreria foto (senza capture) */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {/* Area drag-and-drop */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`w-full py-10 flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed transition-colors ${
              isDragging
                ? "border-pokemon-blue bg-blue-50 dark:bg-blue-900/20 scale-[0.99]"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {isDragging ? (
              <p className="font-semibold text-pokemon-blue px-4 text-center">
                Rilascia la foto qui
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-4 text-center">
                Trascina un'immagine qui, oppure usa i pulsanti sotto
              </p>
            )}
          </div>

          {/* Pulsanti azione */}
          <div className="flex gap-3 mt-4">
            {/* Fotocamera */}
            <button
              onClick={() => setShowCamera(true)}
              className="flex-1 flex flex-col items-center gap-2 py-5 bg-pokemon-blue text-white rounded-2xl touch-manipulation active:scale-[0.97] transition-transform"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-semibold">Fotocamera</span>
            </button>

            {/* Libreria foto */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 py-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl touch-manipulation active:scale-[0.97] transition-transform"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-semibold">Libreria foto</span>
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            Le carte vengono identificate da Grok Vision AI
          </p>

          {/* Separatore */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              oppure
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Inserimento manuale (senza scansione) */}
          <ManualEntry />
        </>
      )}

      {/* ── UPLOADING ────────────────────────────────────────────────── */}
      {stage === "uploading" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">Caricamento foto…</p>
        </div>
      )}

      {/* ── POLLING ──────────────────────────────────────────────────── */}
      {stage === "polling" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              {processingMsg}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Potrebbe richiedere 10–30 secondi
            </p>
          </div>
        </div>
      )}

      {/* ── REVIEW ───────────────────────────────────────────────────── */}
      {stage === "review" && finalResult && sessionId !== null && (
        <ScanReview
          sessionId={sessionId}
          candidates={finalResult.session.candidates}
          onRestart={reset}
        />
      )}

      {/* ── ERROR ────────────────────────────────────────────────────── */}
      {stage === "error" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-200 text-center text-sm max-w-xs">
            {errorMsg}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-pokemon-blue text-white rounded-xl text-sm font-medium touch-manipulation"
          >
            Riprova
          </button>
        </div>
      )}
    </div>
  );
}
