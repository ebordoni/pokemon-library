import axios from "axios";
import type {
  Card,
  CardFilters,
  CatalogStatus,
  CollectionStats,
  PaginatedCards,
  ScanConfirmResponse,
  ScanDecision,
  ScanEnqueueResponse,
  ScanStatusResponse,
} from "../types";

// Use a relative base URL (no leading slash) so the browser resolves it
// relative to the document URL — works both in local dev and under any
// HA Ingress path without any path-guessing.
const apiClient = axios.create({
  baseURL: "api",
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

  deleteCard: (id: string) =>
    apiClient.delete<{ id: string; remainingQuantity: number }>(`/cards/${id}`),

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

  /** Apply per-candidate review decisions for a scan session */
  confirmScan: (sessionId: number, decisions: ScanDecision[]) =>
    apiClient.post<ScanConfirmResponse>(`/scan/${sessionId}/confirm`, {
      decisions,
    }),

  // ── Stats ──────────────────────────────────────────────────────────────
  getStats: () => apiClient.get<CollectionStats>("/stats"),

  // ── Catalog ────────────────────────────────────────────────────────────
  getCatalogStatus: () => apiClient.get<CatalogStatus>("/catalog"),

  triggerCatalogUpdate: () => apiClient.post("/catalog/update"),
};
