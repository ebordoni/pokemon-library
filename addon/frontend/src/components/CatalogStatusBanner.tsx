import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { CatalogStatus } from "../types";

export default function CatalogStatusBanner() {
  const [status, setStatus] = useState<CatalogStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await api.getCatalogStatus();
        if (cancelled) return;
        setStatus(data);
        if (data.isSeeding) {
          setTimeout(() => void check(), 3_000);
        }
      } catch {
        // ignore network errors — banner is non-critical
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.isSeeding) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-800">
      <svg
        className="w-4 h-4 animate-spin shrink-0"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        />
      </svg>
      <span>
        Costruzione catalogo carte…
        {status.seedingProgress && (
          <span className="text-yellow-600 ml-1 text-xs">
            {status.seedingProgress}
          </span>
        )}
      </span>
    </div>
  );
}
