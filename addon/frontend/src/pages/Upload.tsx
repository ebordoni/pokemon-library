import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import CardTile from "../components/CardTile";
import { useScanStatus } from "../hooks/useScanStatus";
import type { ScanStatusResponse } from "../types";

type Stage = "idle" | "uploading" | "polling" | "done" | "error";

export default function Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queuePos, setQueuePos] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scanStatus = useScanStatus(stage === "polling" ? sessionId : null);
  const [finalResult, setFinalResult] = useState<ScanStatusResponse | null>(null);

  // Transition out of polling when scan reaches a terminal state
  useEffect(() => {
    if (!scanStatus || stage !== "polling") return;
    const s = scanStatus.session.status;
    if (s === "completed") {
      setFinalResult(scanStatus);
      setStage("done");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <h1 className="text-xl font-bold text-gray-900 mb-6">Aggiungi Carte</h1>

      {/* ── IDLE ─────────────────────────────────────────────────────── */}
      {stage === "idle" && (
        <>
          {/* Hidden file input — opens camera on mobile, file picker on desktop */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {/* Drop zone / camera button */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`w-full py-14 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border-2 border-dashed transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
              isDragging
                ? "border-pokemon-blue bg-blue-50 scale-[0.99]"
                : "border-gray-300 hover:border-pokemon-blue hover:bg-blue-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? "bg-blue-600" : "bg-pokemon-blue"
              }`}
            >
              <svg
                className="w-10 h-10 text-white"
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
            </div>
            <div className="text-center px-4">
              {isDragging ? (
                <p className="font-semibold text-pokemon-blue">
                  Rilascia la foto qui
                </p>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">
                    Scatta una foto o trascina un'immagine
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Disponi fino a 4 carte faccia in su, con buona luce
                  </p>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Le carte vengono identificate da Grok Vision AI
          </p>
        </>
      )}

      {/* ── UPLOADING ────────────────────────────────────────────────── */}
      {stage === "uploading" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Caricamento foto…</p>
        </div>
      )}

      {/* ── POLLING ──────────────────────────────────────────────────── */}
      {stage === "polling" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-gray-700 font-medium">{processingMsg}</p>
            <p className="text-xs text-gray-400 mt-1">
              Potrebbe richiedere 10–30 secondi
            </p>
          </div>
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────────────── */}
      {stage === "done" && finalResult && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900">
              {finalResult.cards.length === 0
                ? "Nessuna carta riconosciuta"
                : finalResult.cards.length === 1
                  ? "Trovata 1 carta"
                  : `Trovate ${finalResult.cards.length} carte`}
            </p>
            <button
              onClick={reset}
              className="text-sm text-pokemon-blue font-medium touch-manipulation"
            >
              Scansiona altre
            </button>
          </div>

          {finalResult.cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {finalResult.cards.map((card) => (
                <CardTile key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">
                Riprova con più luce o avvicinati alle carte
              </p>
              <button
                onClick={reset}
                className="mt-4 px-6 py-2.5 bg-pokemon-blue text-white rounded-xl text-sm font-medium touch-manipulation"
              >
                Riprova
              </button>
            </div>
          )}
        </div>
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
          <p className="text-gray-700 text-center text-sm max-w-xs">{errorMsg}</p>
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
