import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { CatalogStatus } from "../types";

type Feedback = { kind: "ok" | "err"; text: string } | null;

function formatDate(iso: string | null): string {
  if (!iso) return "mai";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CatalogManager() {
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.getCatalogStatus();
      setStatus(data);
      if (data.isSeeding) {
        timer.current = setTimeout(() => void refresh(), 3_000);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  async function handleUpdate() {
    setBusy(true);
    setFeedback(null);
    try {
      await api.triggerCatalogUpdate();
      setFeedback({ kind: "ok", text: "Aggiornamento avviato in background…" });
      void refresh();
    } catch {
      setFeedback({ kind: "err", text: "Impossibile avviare l'aggiornamento" });
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    setFeedback(null);
    try {
      const { data } = await api.clearCatalog();
      setFeedback({
        kind: "ok",
        text: `Catalogo svuotato (${data.removed.toLocaleString()} carte rimosse)`,
      });
      setConfirmClear(false);
      void refresh();
    } catch (err: unknown) {
      const text =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Impossibile svuotare il catalogo";
      setFeedback({ kind: "err", text });
    } finally {
      setBusy(false);
    }
  }

  const seeding = status?.isSeeding ?? false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
        Catalogo carte
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Database locale scaricato da PokemonTCG (usato per identificazione e
        inserimento manuale). Non intacca la tua collezione.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Carte</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {(status?.cardCount ?? 0).toLocaleString()}
            {status ? ` · ${status.setCount} set` : ""}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            Ultimo aggiornamento
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs mt-1">
            {formatDate(status?.lastUpdated ?? null)}
          </p>
        </div>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300 mb-3">
          <span className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span>
            {status?.seedingProgress ?? "Costruzione catalogo in corso…"}
          </span>
        </div>
      )}

      {feedback && (
        <p
          className={`text-sm mb-3 ${
            feedback.kind === "ok"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => void handleUpdate()}
          disabled={busy || seeding}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-pokemon-blue text-white disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {seeding ? "In corso…" : "Aggiorna catalogo"}
        </button>

        {confirmClear ? (
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => void handleClear()}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-pokemon-red text-white disabled:opacity-40 touch-manipulation"
            >
              Conferma
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              disabled={busy}
              className="px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 touch-manipulation"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            disabled={busy || seeding || (status?.cardCount ?? 0) === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-pokemon-red text-pokemon-red disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            Svuota catalogo
          </button>
        )}
      </div>
    </div>
  );
}
