import { useState } from "react";
import Lightbox from "./Lightbox";

interface Props {
  /** Thumbnail source shown inline. */
  src?: string;
  /** Optional high-res source used for the full-screen view. */
  hiresSrc?: string;
  alt: string;
  /** Classes for the wrapper (controls the thumbnail box size). */
  className?: string;
  /** Classes for the <img> element. */
  imgClassName?: string;
}

/**
 * A thumbnail image with an "eye" button overlay that opens a full-screen
 * Lightbox. Shows a neutral placeholder when no image is available. Reused by
 * both manual entry and the AI scan review.
 */
export default function ImagePreview({
  src,
  hiresSrc,
  alt,
  className = "",
  imgClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const zoomSrc = hiresSrc ?? src;

  return (
    <div className={`relative ${className}`}>
      {src ? (
        <img src={src} alt={alt} className={imgClassName} loading="lazy" />
      ) : (
        <div
          className={`bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600 ${imgClassName}`}
        >
          No image
        </div>
      )}

      {zoomSrc && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ingrandisci anteprima"
          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform touch-manipulation"
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
              strokeWidth={1.8}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      )}

      {open && zoomSrc && (
        <Lightbox src={zoomSrc} alt={alt} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
