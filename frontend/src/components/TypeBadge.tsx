const TYPE_COLORS: Record<string, string> = {
  Fire:      "bg-orange-500 text-white",
  Water:     "bg-blue-500 text-white",
  Grass:     "bg-green-600 text-white",
  Lightning: "bg-yellow-400 text-black",
  Psychic:   "bg-pink-500 text-white",
  Fighting:  "bg-red-700 text-white",
  Darkness:  "bg-gray-800 text-white",
  Metal:     "bg-gray-400 text-black",
  Dragon:    "bg-purple-600 text-white",
  Colorless: "bg-gray-300 text-gray-800",
  Fairy:     "bg-pink-300 text-gray-900",
};

export default function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? "bg-gray-500 text-white";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {type}
    </span>
  );
}
