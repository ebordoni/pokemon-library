import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ScanStatusResponse } from "../types";

/**
 * Polls GET /api/scan/:sessionId every 2 seconds until the scan reaches
 * a terminal state (completed or error). Cleans up on unmount or when
 * sessionId changes.
 */
export function useScanStatus(sessionId: number | null): ScanStatusResponse | null {
  const [status, setStatus] = useState<ScanStatusResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await api.getScanStatus(sessionId);
        if (cancelled) return;
        setStatus(data);

        const s = data.session.status;
        if (s === "pending" || s === "processing") {
          timerRef.current = setTimeout(() => void poll(), 2_000);
        }
      } catch {
        if (!cancelled) {
          timerRef.current = setTimeout(() => void poll(), 3_000);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  return status;
}
