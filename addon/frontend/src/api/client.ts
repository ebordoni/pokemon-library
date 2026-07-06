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

// HA Supervisor injects the ingress base path via the backend into
// window.__INGRESS_BASE__ (e.g. "/api/hassio_ingress/<token>").
// Fall back to document.baseURI resolution for local dev.
declare global {
  interface Window { __INGRESS_BASE__?: string; }
}
const baseURL = window.__INGRESS_BASE__
  ? `${window.__INGRESS_BASE__.replace(/\/+$/, "")}/api`
  : new URL("./api", document.baseURI).pathname;

const apiClient = axios.create({
  baseURL,
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
