import axios from "axios";
import type {
  Card,
  CardFilters,
  CatalogStatus,
  CollectionStats,
  PaginatedCards,
  ScanEnqueueResponse,
  ScanStatusResponse,
} from "../types";

const apiClient = axios.create({
  // Resolve "./api" relative to the document's base URI — works both in
  // local dev (http://localhost:5173/) and under HA Ingress
  // (http://ha-ip:8123/api/hassio_ingress/<token>/).
  baseURL: new URL("./api", document.baseURI).pathname,
  timeout: 90_000,
});

export const api = {
  health: () =>
    apiClient.get<{ status: string; version: string; timestamp: string }>(
      "/health",
    ),

  // ── Cards ──────────────────────────────────────────────────────────────
  getCards: (filters?: CardFilters) =>
    apiClient.get<PaginatedCards>("/cards", { params: filters }),

  getCard: (id: string) => apiClient.get<Card>(`/cards/${id}`),

  deleteCard: (id: string) => apiClient.delete(`/cards/${id}`),

  updateQuantity: (id: string, quantity: number) =>
    apiClient.patch<Card>(`/cards/${id}/quantity`, { quantity }),

  // ── Scan ───────────────────────────────────────────────────────────────
  /** Upload image → enqueue → returns sessionId immediately (202) */
  scanImage: (imageFile: File) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    return apiClient.post<ScanEnqueueResponse>("/scan", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30_000,
    });
  },

  getScanStatus: (sessionId: number) =>
    apiClient.get<ScanStatusResponse>(`/scan/${sessionId}`),

  // ── Stats ──────────────────────────────────────────────────────────────
  getStats: () => apiClient.get<CollectionStats>("/stats"),

  // ── Catalog ────────────────────────────────────────────────────────────
  getCatalogStatus: () => apiClient.get<CatalogStatus>("/catalog"),

  triggerCatalogUpdate: () => apiClient.post("/catalog/update"),
};
