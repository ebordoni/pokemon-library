import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import type { CollectionStats } from "../types";

// Matches TypeBadge colors
const TYPE_HEX: Record<string, string> = {
  Fire: "#f97316",
  Water: "#3b82f6",
  Grass: "#16a34a",
  Lightning: "#eab308",
  Psychic: "#ec4899",
  Fighting: "#b91c1c",
  Darkness: "#1f2937",
  Metal: "#9ca3af",
  Dragon: "#7c3aed",
  Colorless: "#d1d5db",
  Fairy: "#f9a8d4",
};

const SUPERTYPE_HEX: Record<string, string> = {
  "Pokémon": "#3b82f6",
  Trainer: "#16a34a",
  Energy: "#f97316",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
      <p className={`text-2xl font-bold ${accent ?? "text-gray-900"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(({ data }) => setStats(data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalCards === 0) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Statistiche</h1>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="font-medium">Nessun dato</p>
          <p className="text-sm">Scansiona delle carte per vedere le statistiche</p>
        </div>
      </div>
    );
  }

  const typeData = Object.entries(stats.byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 9)
    .map(([name, value]) => ({ name, value }));

  const rarityData = Object.entries(stats.byRarity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const supertypeData = Object.entries(stats.bySupertype)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const maxSet = stats.topSets[0]?.count ?? 1;

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Statistiche</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Totale carte" value={stats.totalCards} />
        <StatCard label="Uniche" value={stats.uniqueCards} />
        <StatCard
          label="Duplicate"
          value={stats.duplicateCards}
          accent={stats.duplicateCards > 0 ? "text-pokemon-red" : "text-gray-900"}
        />
      </div>

      {/* By Supertype — donut */}
      {supertypeData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-1">Categoria</p>
          <div className="flex items-center gap-4">
            <div className="shrink-0" style={{ width: 130, height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supertypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {supertypeData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SUPERTYPE_HEX[entry.name] ?? "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} carte`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {supertypeData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: SUPERTYPE_HEX[name] ?? "#9ca3af" }}
                    />
                    <span className="text-gray-700">{name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Energy Types — horizontal bars */}
      {typeData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Tipi Energia
          </p>
          <ResponsiveContainer
            width="100%"
            height={Math.max(140, typeData.length * 28)}
          >
            <BarChart
              data={typeData}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={72}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                formatter={(v) => [`${v} carte`, ""]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {typeData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={TYPE_HEX[entry.name] ?? "#9ca3af"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rarity */}
      {rarityData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Rarità</p>
          <ResponsiveContainer
            width="100%"
            height={Math.max(120, rarityData.length * 28)}
          >
            <BarChart
              data={rarityData}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={90}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                formatter={(v) => [`${v} carte`, ""]}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 10 Sets — CSS progress bars */}
      {stats.topSets.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Set più frequenti</p>
          <div className="space-y-2.5">
            {stats.topSets.map(({ setName, count }) => {
              const pct = Math.round((count / maxSet) * 100);
              return (
                <div key={setName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate mr-2">{setName}</span>
                    <span className="text-gray-500 font-medium shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pokemon-blue rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
