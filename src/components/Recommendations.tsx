"use client";

import { SearchResult } from "@/lib/types";

interface RecommendationsProps {
  recommendations: SearchResult[];
  onSelect: (result: SearchResult) => void;
  title?: string;
}

export default function Recommendations({
  recommendations,
  onSelect,
  title = "Recommended for Layering",
}: RecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {recommendations.slice(0, 10).map((rec) => (
          <button
            key={rec.id}
            onClick={() => onSelect(rec)}
            className="group p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-amber-600/50 hover:bg-zinc-800/50 transition-all text-left"
          >
            {rec.imageUrl && (
              <img
                src={rec.imageUrl}
                alt={rec.name}
                className="w-full h-24 object-contain rounded-lg bg-zinc-800 mb-2 group-hover:scale-105 transition-transform"
              />
            )}
            <p className="font-medium text-sm text-white truncate group-hover:text-amber-400 transition-colors">
              {rec.name}
            </p>
            <p className="text-xs text-zinc-500 truncate">{rec.brand}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
