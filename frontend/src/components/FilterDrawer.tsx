import { useState } from "react";
import type { CardFilters } from "../types";

interface Props {
  filters: CardFilters;
  onFiltersChange: (f: CardFilters) => void;
}

const SUPERTYPES = ["Pokémon", "Trainer", "Energy"] as const;
const ENERGY_TYPES = [
  "Fire", "Water", "Grass", "Lightning", "Psychic",
  "Fighting", "Darkness", "Metal", "Dragon", "Colorless", "Fairy",
];

export default function FilterDrawer({ filters, onFiltersChange }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [filters.supertype, filters.type, filters.duplicates].filter(Boolean).length;

  function patch(update: Partial<CardFilters>) {
    onFiltersChange({ ...filters, ...update, page: 1 });
  }

  function clear() {
    onFiltersChange({ limit: filters.limit, page: 1 });
    setOpen(false);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
        aria-label="Open filters"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-pokemon-red text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!open}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-4 max-h-[80dvh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg text-gray-900">Filter Cards</h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Supertype */}
          <p className="text-sm font-medium text-gray-600 mb-2">Category</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {SUPERTYPES.map((st) => (
              <button
                key={st}
                onClick={() =>
                  patch({ supertype: filters.supertype === st ? undefined : (st as CardFilters["supertype"]) })
                }
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors touch-manipulation ${
                  filters.supertype === st
                    ? "bg-pokemon-blue text-white border-pokemon-blue"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Energy type */}
          <p className="text-sm font-medium text-gray-600 mb-2">Energy Type</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {ENERGY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => patch({ type: filters.type === t ? undefined : t })}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors touch-manipulation ${
                  filters.type === t
                    ? "bg-pokemon-blue text-white border-pokemon-blue"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Duplicates only */}
          <button
            onClick={() => patch({ duplicates: filters.duplicates ? undefined : true })}
            className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors touch-manipulation mb-4 ${
              filters.duplicates
                ? "bg-pokemon-red text-white border-pokemon-red"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {filters.duplicates ? "✓ Duplicates only" : "Show duplicates only"}
          </button>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={clear}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-pokemon-blue text-white hover:bg-blue-700 touch-manipulation"
            >
              Apply
            </button>
          </div>
        </div>

        {/* iOS safe area */}
        <div className="h-safe-bottom" />
      </div>
    </>
  );
}
