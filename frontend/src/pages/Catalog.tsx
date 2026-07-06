import { useEffect, useState } from "react";
import CardGrid from "../components/CardGrid";
import FilterDrawer from "../components/FilterDrawer";
import { useCollectionStore } from "../store/useCollectionStore";
import type { CardFilters } from "../types";

export default function Catalog() {
  const {
    cards,
    total,
    isLoading,
    isLoadingMore,
    totalPages,
    filters,
    fetchCards,
    setFilters,
    loadMore,
  } = useCollectionStore();
  const [searchValue, setSearchValue] = useState(filters.q ?? "");

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  function handleSearch(q: string) {
    setSearchValue(q);
    setFilters({ ...filters, q: q || undefined });
  }

  function handleFilters(newFilters: CardFilters) {
    setFilters(newFilters);
  }

  const page = filters.page ?? 1;
  const hasMore = page < totalPages;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            My Collection
          </h1>
          {total > 0 && (
            <p className="text-sm text-gray-500">
              {total.toLocaleString()} card{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <FilterDrawer filters={filters} onFiltersChange={handleFilters} />
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, set or number…"
          className="w-full pl-9 pr-9 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pokemon-blue/30 focus:border-pokemon-blue"
        />
        {searchValue && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4"
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

      {/* Active filter chips */}
      {(filters.type || filters.supertype || filters.duplicates) && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {filters.supertype && (
            <button
              onClick={() =>
                setFilters({ ...filters, supertype: undefined })
              }
              className="px-3 py-1 bg-pokemon-blue text-white text-xs rounded-full touch-manipulation"
            >
              {filters.supertype} ×
            </button>
          )}
          {filters.type && (
            <button
              onClick={() =>
                setFilters({ ...filters, type: undefined })
              }
              className="px-3 py-1 bg-pokemon-blue text-white text-xs rounded-full touch-manipulation"
            >
              {filters.type} ×
            </button>
          )}
          {filters.duplicates && (
            <button
              onClick={() =>
                setFilters({ ...filters, duplicates: undefined })
              }
              className="px-3 py-1 bg-pokemon-red text-white text-xs rounded-full touch-manipulation"
            >
              Duplicates ×
            </button>
          )}
        </div>
      )}

      <CardGrid cards={cards} isLoading={isLoading} />

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => void loadMore()}
            disabled={isLoadingMore}
            className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 touch-manipulation disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMore && (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            )}
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

