import { useMemo, useState } from "react";
import { api } from "../api/client";
import type { ScanCandidate, ScanConfirmResponse, ScanDecision } from "../types";
import TypeBadge from "./TypeBadge";

type Action = "add" | "skip";
type Phase = "review" | "applying" | "done" | "error";

/**
 * Post-scan review screen. Shows each AI-identified card and lets the user
 * confirm/reject it. Cards already in the collection are flagged so the user
 * can decide whether to add a duplicate (+1) or discard them. Nothing is
 * written to the collection until "Applica" is pressed.
 */
export default function ScanReview({
  sessionId,
  candidates,
  onRestart,
}: {
  sessionId: number;
  candidates: ScanCandidate[];
  onRestart: () => void;
}) {
  const matched = useMemo(
    () => candidates.filter((c) => c.matched && c.card),
    [candidates],
  );
  const unmatched = useMemo(
    () => candidates.filter((c) => !c.matched),
    [candidates],
  );

  const [decisions, setDecisions] = useState<Record<number, Action>>(() => {
    const init: Record<number, Action> = {};
    for (const c of matched) {
      // Default: add new cards, but require an explicit choice for cards that
      // are already in the collection (default to skip to avoid accidental dupes).
      init[c.index] = c.alreadyInCollection ? "skip" : "add";
    }
    return init;
  });

  const [phase, setPhase] = useState<Phase>("review");
  const [result, setResult] = useState<ScanConfirmResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addCount = matched.filter((c) => decisions[c.index] === "add").length;

  function setAction(index: number, action: Action) {
    setDecisions((d) => ({ ...d, [index]: action }));
  }

  async function apply() {
    setPhase("applying");
    const payload: ScanDecision[] = matched.map((c) => ({
      index: c.index,
      action: decisions[c.index] ?? "skip",
    }));
    try {
      const { data } = await api.confirmScan(sessionId, payload);
      setResult(data);
      setPhase("done");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Impossibile salvare le scelte — riprova";
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  // ── Success summary ──────────────────────────────────────────────────────
  if (phase === "done" && result) {
    const parts: string[] = [];
    if (result.addedCount > 0)
      parts.push(
        `${result.addedCount} ${result.addedCount === 1 ? "nuova" : "nuove"}`,
      );
    if (result.duplicateCount > 0)
      parts.push(`${result.duplicateCount} doppioni`);
    if (result.skippedCount > 0) parts.push(`${result.skippedCount} scartate`);

    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {result.addedCount + result.duplicateCount > 0
              ? "Collezione aggiornata"
              : "Nessuna carta aggiunta"}
          </p>
          {parts.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              {parts.join(" · ")}
            </p>
          )}
        </div>
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-pokemon-blue text-white rounded-xl text-sm font-medium touch-manipulation"
        >
          Scansiona altre
        </button>
      </div>
    );
  }

  // ── Nothing matched the catalog ────────────────────────────────────────────
  if (matched.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-sm">
          Nessuna carta riconosciuta nel catalogo.
          <br />
          Riprova con più luce o avvicinati alle carte.
        </p>
        {unmatched.length > 0 && (
          <ul className="mt-4 text-xs space-y-1">
            {unmatched.map((c) => (
              <li key={c.index}>
                Letto: {c.raw.name} — {c.raw.set} #{c.raw.number}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onRestart}
          className="mt-6 px-6 py-2.5 bg-pokemon-blue text-white rounded-xl text-sm font-medium touch-manipulation"
        >
          Riprova
        </button>
      </div>
    );
  }

  // ── Review list ────────────────────────────────────────────────────────────
  const applying = phase === "applying";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {matched.length === 1
            ? "1 carta identificata"
            : `${matched.length} carte identificate`}
        </p>
        <button
          onClick={onRestart}
          className="text-sm text-pokemon-blue font-medium touch-manipulation"
        >
          Annulla
        </button>
      </div>

      {phase === "error" && errorMsg && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <ul className="space-y-3">
        {matched.map((c) => {
          const card = c.card!;
          const action = decisions[c.index] ?? "skip";
          const dup = c.alreadyInCollection;
          return (
            <li
              key={c.index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <div className="w-14 aspect-[3/4] shrink-0 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {card.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {card.setName} · #{card.number}
                  </p>
                  {dup && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Già in collezione ×{c.currentQuantity}
                    </span>
                  )}
                  {card.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {card.types.slice(0, 3).map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-card decision */}
              <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  disabled={applying}
                  onClick={() => setAction(c.index, "add")}
                  className={`py-2.5 text-sm font-medium touch-manipulation transition-colors ${
                    action === "add"
                      ? dup
                        ? "bg-pokemon-red text-white"
                        : "bg-pokemon-blue text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {dup ? "+1 doppione" : "Aggiungi"}
                </button>
                <button
                  disabled={applying}
                  onClick={() => setAction(c.index, "skip")}
                  className={`py-2.5 text-sm font-medium touch-manipulation transition-colors border-l border-gray-100 dark:border-gray-700 ${
                    action === "skip"
                      ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {dup ? "Scarta" : "Rifiuta"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {unmatched.length > 0 && (
        <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Non trovate in catalogo (non aggiungibili)
          </p>
          <ul className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
            {unmatched.map((c) => (
              <li key={c.index} className="truncate">
                {c.raw.name} — {c.raw.set} #{c.raw.number}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button
          disabled={applying}
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation disabled:opacity-50"
        >
          Annulla
        </button>
        <button
          disabled={applying}
          onClick={() => void apply()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-pokemon-blue text-white hover:bg-blue-700 touch-manipulation disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {applying && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {addCount > 0 ? `Applica (${addCount})` : "Applica"}
        </button>
      </div>
    </div>
  );
}
