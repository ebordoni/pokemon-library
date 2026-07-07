import { useState } from "react";
import { api } from "../api/client";
import type { ManualLookupResponse } from "../types";

interface Props {
  /** Called after a card is successfully added to the collection. */
  onAdded?: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "found"; preview: ManualLookupResponse }
  | { kind: "adding"; preview: ManualLookupResponse }
  | { kind: "added"; message: string }
  | { kind: "error"; message: string };

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

export default function ManualEntry({ onAdded }: Props) {
  const [set, setSet] = useState("");
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const canSearch =
    set.trim().length > 0 &&
    number.trim().length > 0 &&
    status.kind !== "searching" &&
    status.kind !== "adding";

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    setStatus({ kind: "searching" });
    try {
      const { data } = await api.lookupManualCard(set.trim(), number.trim());
      setStatus({ kind: "found", preview: data });
    } catch (err: unknown) {
      setStatus({
        kind: "error",
        message: extractError(err, "Carta non trovata nel catalogo locale"),
      });
    }
  }

  async function handleAdd(preview: ManualLookupResponse) {
    setStatus({ kind: "adding", preview });
    try {
      const { data } = await api.addManualCard(set.trim(), number.trim());
      const label = data.wasDuplicate
        ? `${data.card.name} — doppione (×${data.card.quantity})`
        : `${data.card.name} aggiunta alla collezione`;
      setStatus({ kind: "added", message: label });
      setSet("");
      setNumber("");
      onAdded?.();
    } catch (err: unknown) {
      setStatus({
        kind: "error",
        message: extractError(err, "Impossibile aggiungere la carta"),
      });
    }
  }

  function resetAll() {
    setStatus({ kind: "idle" });
  }

  const preview =
    status.kind === "found" || status.kind === "adding"
      ? status.preview
      : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-1">
        <svg
          className="w-5 h-5 text-pokemon-blue"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          Inserimento manuale
        </h2>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Cerca nel catalogo locale con il codice stampato sulla carta — senza AI.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={set}
          onChange={(e) => setSet(e.target.value)}
          placeholder="Set (es. TWM)"
          autoCapitalize="characters"
          className="w-28 shrink-0 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 uppercase placeholder:normal-case placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
        />
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Numero (es. 126/167)"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
        />
        <button
          type="submit"
          disabled={!canSearch}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-pokemon-blue text-white disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {status.kind === "searching" ? "…" : "Cerca"}
        </button>
      </form>

      {/* Error */}
      {status.kind === "error" && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <span>{status.message}</span>
        </div>
      )}

      {/* Success */}
      {status.kind === "added" && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ {status.message}
          </p>
          <button
            onClick={resetAll}
            className="text-xs text-gray-400 dark:text-gray-500 underline touch-manipulation"
          >
            Aggiungi un'altra
          </button>
        </div>
      )}

      {/* Preview + confirm */}
      {preview && (
        <div className="mt-4 flex gap-3 items-center">
          {preview.card.imageUrl ? (
            <img
              src={preview.card.imageUrl}
              alt={preview.card.name}
              className="w-16 rounded-lg shadow"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-[88px] rounded-lg bg-gray-100 dark:bg-gray-700" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {preview.card.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {preview.card.setName} · {preview.card.number}
              {preview.card.rarity ? ` · ${preview.card.rarity}` : ""}
            </p>
            {preview.alreadyInCollection && (
              <p className="text-xs text-pokemon-red mt-0.5">
                Già in collezione ×{preview.currentQuantity}
              </p>
            )}
          </div>
          <button
            onClick={() => void handleAdd(preview)}
            disabled={status.kind === "adding"}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white disabled:opacity-40 touch-manipulation"
          >
            {status.kind === "adding"
              ? "…"
              : preview.alreadyInCollection
                ? "+1 doppione"
                : "Aggiungi"}
          </button>
        </div>
      )}
    </div>
  );
}
