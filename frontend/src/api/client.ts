import axios from "axios";
import type {
  Card,
  CardFilters,
  CollectionStats,
  PaginatedCards,
  ScanResponse,
} from "../types";

const apiClient = axios.create({
  baseURL: "/api",
  timeout: 90_000, // 90 s — AI identification may take time
});

export const api = {
  health: () =>
    apiClient.get<{ status: string; version: string; timestamp: string }>(
      "/health",
    ),

  // ── Cards ────────────────────────────────────────────────────────────────
  getCards: (filters?: CardFilters) =>
    apiClient.get<PaginatedCards>("/cards", { params: filters }),

  getCard: (id: string) => apiClient.get<Card>(`/cards/${id}`),

  deleteCard: (id: string) => apiClient.delete(`/cards/${id}`),

  updateQuantity: (id: string, quantity: number) =>
    apiClient.patch(`/cards/${id}/quantity`, { quantity }),

  // ── Scan ─────────────────────────────────────────────────────────────────
  scanImage: (imageFile: File) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    return apiClient.post<ScanResponse>("/scan", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getStats: () => apiClient.get<CollectionStats>("/stats"),
};
