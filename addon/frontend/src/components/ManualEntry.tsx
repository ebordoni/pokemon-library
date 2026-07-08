import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { CatalogSet, ManualLookupResponse } from "../types";
import ImagePreview from "./ImagePreview";

interface Props {
  /** Called after a card is successfully added to the collection. */
  onAdded?: () => void;
  /** When provided, renders as a top-anchored modal with a close button. */
  onClose?: () => void;
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

export default function ManualEntry({ onAdded, onClose }: Props) {
  const asModal = typeof onClose === "function";

  // Set / series autocomplete
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [set, setSet] = useState("");
  const [setLabel, setSetLabel] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const setBoxRef = useRef<HTMLDivElement>(null);

  // Card number: two numeric fields (num / total) with the slash between them,
  // plus an optional free-text mode for special prints (TG, GG, promos…).
  const [num, setNum] = useState("");
  const [total, setTotal] = useState("");
  const [special, setSpecial] = useState(false);
  const [specialNum, setSpecialNum] = useState("");

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Preload the set list once (for autocomplete). Failure is non-fatal —
  // the fields still accept free text.
  useEffect(() => {
    let cancelled = false;
    api
      .getSets()
      .then(({ data }) => {
        if (!cancelled) setSets(data);
      })
      .catch(() => {
        /* ignore — offline / empty catalog */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the autocomplete dropdown when clicking outside.
  useEffect(() => {
    if (!showList) return;
    function onDown(e: MouseEvent) {
      if (setBoxRef.current && !setBoxRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showList]);

  const suggestions = useMemo(() => {
    const q = set.trim().toLowerCase();
    const base = q
      ? sets.filter(
          (s) =>
            (s.ptcgoCode?.toLowerCase().includes(q) ?? false) ||
            s.setName.toLowerCase().includes(q) ||
            s.setId.toLowerCase().includes(q),
        )
      : sets;
    return base.slice(0, 30);
  }, [sets, set]);

  const effectiveNumber = special
    ? specialNum.trim()
    : total.trim()
      ? `${num.trim()}/${total.trim()}`
      : num.trim();

  const canSearch =
    set.trim().length > 0 &&
    (special ? specialNum.trim().length > 0 : num.trim().length > 0) &&
    status.kind !== "searching" &&
    status.kind !== "adding";

  function selectSet(s: CatalogSet) {
    setSet(s.ptcgoCode ?? s.setId);
    setSetLabel(s.setName);
    setShowList(false);
  }

  async function runSearch() {
    setShowList(false);
    setStatus({ kind: "searching" });
    try {
      const { data } = await api.lookupManualCard(set.trim(), effectiveNumber);
      setStatus({ kind: "found", preview: data });
    } catch (err: unknown) {
      setStatus({
        kind: "error",
        message: extractError(err, "Carta non trovata nel catalogo locale"),
      });
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    void runSearch();
  }

  async function handleAdd(preview: ManualLookupResponse) {
    setStatus({ kind: "adding", preview });
    try {
      const { data } = await api.addManualCard(set.trim(), effectiveNumber);
      const label = data.wasDuplicate
        ? `${data.card.name} — doppione (×${data.card.quantity})`
        : `${data.card.name} aggiunta alla collezione`;
      setStatus({ kind: "added", message: label });
      setSet("");
      setSetLabel(null);
      setNum("");
      setTotal("");
      setSpecialNum("");
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
    status.kind === "found" || status.kind === "adding" ? status.preview : null;

  const body = (
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
        {asModal && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="ml-auto w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 touch-manipulation"
          >
            <svg
              className="w-5 h-5"
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
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Cerca nel catalogo locale con il codice stampato sulla carta — senza AI.
      </p>

      <form onSubmit={handleSearch} className="space-y-2">
        {/* Series autocomplete */}
        <div ref={setBoxRef} className="relative">
          <input
            type="text"
            value={set}
            onChange={(e) => {
              setSet(e.target.value);
              setSetLabel(null);
              setShowList(true);
            }}
            onFocus={() => setShowList(true)}
            placeholder="Serie (es. TWM o Twilight…)"
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
          />
          {setLabel && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
              {setLabel}
            </p>
          )}
          {showList && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg text-sm">
              {suggestions.map((s) => (
                <li key={s.setId}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSet(s);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                  >
                    <span className="inline-block min-w-[3rem] shrink-0 font-mono text-xs font-semibold text-pokemon-blue">
                      {s.ptcgoCode ?? s.setId}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-200">
                      {s.setName}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {s.cardCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card number */}
        {special ? (
          <input
            type="text"
            value={specialNum}
            onChange={(e) =>
              setSpecialNum(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
            placeholder="Numero speciale (es. TG05, GG01, SWSH123)"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 uppercase placeholder:normal-case placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={num}
              onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))}
              placeholder="126"
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-center text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
            />
            <span className="text-gray-400 dark:text-gray-500 font-semibold">
              /
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
              placeholder="167"
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-center text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pokemon-blue"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSpecial((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-500 underline touch-manipulation"
          >
            {special ? "Numero standard" : "Carta speciale (TG, GG, promo…)"}
          </button>
          <button
            type="submit"
            disabled={!canSearch}
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium bg-pokemon-blue text-white disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            {status.kind === "searching" ? "…" : "Cerca"}
          </button>
        </div>
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
          <ImagePreview
            src={preview.card.imageUrl}
            hiresSrc={preview.card.imageUrlHires}
            alt={preview.card.name}
            className="w-16 shrink-0"
            imgClassName="w-16 aspect-[3/4] rounded-lg shadow object-contain"
          />
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

  if (!asModal) return body;

  // Modal: anchored to the top so the on-screen keyboard (which docks at the
  // bottom on mobile) never covers the input fields.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-3 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-md mt-2 mb-6">{body}</div>
    </div>
  );
}
