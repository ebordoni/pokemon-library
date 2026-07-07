import { Link } from "react-router-dom";
import type { Card } from "../types";
import DuplicateBadge from "./DuplicateBadge";
import TypeBadge from "./TypeBadge";

export default function CardTile({ card }: { card: Card }) {
  return (
    <Link
      to={`/cards/${card.id}`}
      className="relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow active:scale-[0.97] touch-manipulation select-none"
    >
      {/* Card image */}
      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
            No image
          </div>
        )}
        <DuplicateBadge count={card.quantity} />
      </div>

      {/* Card info */}
      <div className="p-2">
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
          {card.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
          {card.setName}
        </p>
        {card.types.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {card.types.slice(0, 2).map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
