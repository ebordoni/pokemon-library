import { create } from "zustand";
import { api } from "../api/client";
import type { Card, CardFilters, PaginatedCards } from "../types";

interface CollectionState {
  cards: Card[];
  total: number;
  page: number;
  totalPages: number;
  filters: CardFilters;
  isLoading: boolean;
  error: string | null;

  fetchCards: (filters?: CardFilters) => Promise<void>;
  setFilters: (filters: CardFilters) => void;
  removeCard: (id: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  cards: [],
  total: 0,
  page: 1,
  totalPages: 1,
  filters: { page: 1, limit: 24 },
  isLoading: false,
  error: null,

  fetchCards: async (filters?: CardFilters) => {
    const activeFilters = filters ?? get().filters;
    set({ isLoading: true, error: null });
    try {
      const { data }: { data: PaginatedCards } =
        await api.getCards(activeFilters);
      set({
        cards: data.data,
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        filters: activeFilters,
        isLoading: false,
      });
    } catch {
      set({ error: "Failed to load collection", isLoading: false });
    }
  },

  setFilters: (filters: CardFilters) => {
    set({ filters });
    void get().fetchCards(filters);
  },

  removeCard: async (id: string) => {
    await api.deleteCard(id);
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
      total: state.total - 1,
    }));
  },
}));
