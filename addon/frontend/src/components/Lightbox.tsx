import { useEffect } from "react";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Full-screen image viewer. Tap the backdrop, press Escape, or use the close
 * button to dismiss. Locks body scroll while open.
 */
export default function Lightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
    >
      <img
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi"
        className="absolute top-5 right-5 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center touch-manipulation"
      >
        <svg
          className="w-5 h-5 text-white"
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
    </div>
  );
}
