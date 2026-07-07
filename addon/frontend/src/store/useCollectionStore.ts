import { create } from "zustand";
import { api } from "../api/client";
import type { Card, CardFilters, PaginatedCards } from "../types";

interface CollectionState {
  cards: Card[];
  total: number;
  totalQuantity: number;
  page: number;
  totalPages: number;
  filters: CardFilters;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  fetchCards: (filters?: CardFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: CardFilters) => void;
  removeCard: (id: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  cards: [],
  total: 0,
  totalQuantity: 0,
  page: 1,
  totalPages: 1,
  filters: { page: 1, limit: 24 },
  isLoading: false,
  isLoadingMore: false,
  error: null,

  fetchCards: async (filters?: CardFilters) => {
    const activeFilters = filters ?? get().filters;
    set({ isLoading: true, error: null });
    try {
      const { data }: { data: PaginatedCards } =
        await api.getCards(activeFilters);
      set({
        cards: data.data ?? [],
        total: data.total ?? 0,
        totalQuantity: data.totalQuantity ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
        filters: activeFilters,
        isLoading: false,
      });
    } catch {
      set({ error: "Failed to load collection", isLoading: false });
    }
  },

  loadMore: async () => {
    const { filters, cards, totalPages, isLoadingMore } = get();
    const nextPage = (filters.page ?? 1) + 1;
    if (isLoadingMore || nextPage > totalPages) return;
    set({ isLoadingMore: true });
    try {
      const { data }: { data: PaginatedCards } = await api.getCards({
        ...filters,
        page: nextPage,
      });
      set({
        cards: [...cards, ...(data.data ?? [])],
        total: data.total ?? 0,
        totalQuantity: data.totalQuantity ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
        filters: { ...filters, page: nextPage },
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  setFilters: (filters: CardFilters) => {
    // Reset to page 1 and replace cards whenever filters change
    const normalized = { ...filters, page: 1 };
    set({ filters: normalized });
    void get().fetchCards(normalized);
  },

  removeCard: async (id: string) => {
    // The backend removes one copy at a time: the row is only deleted when the
    // last copy is removed (remainingQuantity === 0). Mirror that here so the
    // UI stays in sync for cards with quantity > 1.
    const { data } = await api.deleteCard(id);
    set((state) => {
      if (data.remainingQuantity > 0) {
        return {
          cards: state.cards.map((c) =>
            c.id === id
              ? {
                  ...c,
                  quantity: data.remainingQuantity,
                  isDuplicate: data.remainingQuantity > 1,
                }
              : c,
          ),
        };
      }
      return {
        cards: state.cards.filter((c) => c.id !== id),
        total: Math.max(0, state.total - 1),
      };
    });
  },
}));
