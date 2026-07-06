import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import TypeBadge from "../components/TypeBadge";
import type { Card } from "../types";

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .getCard(id)
      .then(({ data }) => setCard(data))
      .catch(() => setError("Card not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleQuantity(delta: number) {
    if (!card) return;
    const newQty = card.quantity + delta;
    if (newQty < 1) {
      await api.deleteCard(card.id);
      navigate("/catalog");
    } else {
      const { data } = await api.updateQuantity(card.id, newQty);
      setCard(data);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 px-4">
        <p className="text-gray-600">{error ?? "Card not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-pokemon-blue font-medium touch-manipulation"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-6 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 touch-manipulation"
          aria-label="Back"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-lg text-gray-900 truncate">{card.name}</h1>
      </div>

      {/* Card image */}
      {(card.imageUrlHires ?? card.imageUrl) && (
        <div className="px-8 mb-6">
          <img
            src={card.imageUrlHires ?? card.imageUrl}
            alt={card.name}
            className="w-full rounded-2xl shadow-lg"
          />
        </div>
      )}

      <div className="px-4 space-y-3">
        {/* Set / number */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Set</p>
            <p className="font-medium text-gray-900 text-sm">{card.setName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Number</p>
            <p className="font-medium text-gray-900 text-sm">#{card.number}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2.5">
          {card.types.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Type</span>
              <div className="flex gap-1">
                {card.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </div>
          )}
          {card.hp && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">HP</span>
              <span className="font-semibold text-gray-900 text-sm">{card.hp}</span>
            </div>
          )}
          {card.rarity && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Rarity</span>
              <span className="text-sm text-gray-700">{card.rarity}</span>
            </div>
          )}
          {card.evolvesFrom && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Evolves from</span>
              <span className="text-sm text-gray-700">{card.evolvesFrom}</span>
            </div>
          )}
        </div>

        {/* Attacks */}
        {card.attacks.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Attacks
            </p>
            <div className="space-y-3">
              {card.attacks.map((attack, i) => (
                <div
                  key={i}
                  className="border-t border-gray-100 first:border-0 pt-3 first:pt-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">
                        {attack.cost.map((c) => c[0]).join("")}
                      </span>
                      <span className="font-medium text-sm text-gray-900">
                        {attack.name}
                      </span>
                    </div>
                    {attack.damage && (
                      <span className="font-bold text-sm text-gray-900">
                        {attack.damage}
                      </span>
                    )}
                  </div>
                  {attack.text && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {attack.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity control */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-3">Copies in collection</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => void handleQuantity(-1)}
              className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-xl font-light hover:bg-gray-50 active:scale-95 touch-manipulation"
              aria-label="Remove one"
            >
              −
            </button>
            <span className="text-3xl font-bold text-gray-900">
              {card.quantity}
            </span>
            <button
              onClick={() => void handleQuantity(1)}
              className="w-11 h-11 rounded-full bg-pokemon-blue text-white flex items-center justify-center text-xl font-light hover:bg-blue-700 active:scale-95 touch-manipulation"
              aria-label="Add one"
            >
              +
            </button>
          </div>
          {card.quantity > 1 && (
            <p className="text-center text-xs text-pokemon-red mt-2 font-medium">
              Duplicate ×{card.quantity}
            </p>
          )}
        </div>

        {/* Remove all */}
        <button
          onClick={() => void handleQuantity(-card.quantity)}
          className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 active:bg-red-100 touch-manipulation"
        >
          Remove from collection
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}
