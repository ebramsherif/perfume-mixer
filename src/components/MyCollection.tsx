"use client";

import { useState, useEffect } from "react";
import { Perfume, SearchResult } from "@/lib/types";
import { calculateMatch } from "@/lib/matchAlgorithm";
import { useSearchV2 } from "@/lib/useSearchV2";

interface CollectionItem {
  perfume: Perfume;
  addedAt: number;
}

interface RankedItem extends CollectionItem {
  matchScore: number;
}

interface MyCollectionProps {
  currentPerfume: Perfume;
  onSelectPairing: (perfume: Perfume) => void;
}

const STORAGE_KEY = "perfume-mixer-collection";

export default function MyCollection({ currentPerfume, onSelectPairing }: MyCollectionProps) {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const { results, isLoading: isSearching, clearResults } = useSearchV2(searchQuery, {
    debounceMs: 400,
  });

  // Load collection from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCollection(JSON.parse(stored));
      } catch {
        console.error("Failed to parse collection from localStorage");
      }
    }
  }, []);

  // Save collection to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  }, [collection]);

  // Calculate match scores and rank
  const rankedCollection: RankedItem[] = collection
    .filter((item) => item.perfume.id !== currentPerfume.id) // Exclude current perfume
    .map((item) => {
      const analysis = calculateMatch(currentPerfume, item.perfume);
      return { ...item, matchScore: analysis.score };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const handleAddPerfume = async (result: SearchResult) => {
    // Check if already in collection
    if (collection.some((item) => item.perfume.id === result.id)) {
      setSearchQuery("");
      clearResults();
      setIsAddingMode(false);
      return;
    }

    setLoadingId(result.id);

    try {
      const params = new URLSearchParams({
        url: result.url,
        name: result.name,
        brand: result.brand,
      });
      if (result.imageUrl) {
        params.set("imageUrl", result.imageUrl);
      }

      const response = await fetch(`/api/perfume?${params}`);
      const data = await response.json();

      if (data.perfume) {
        setCollection((prev) => [
          ...prev,
          { perfume: data.perfume, addedAt: Date.now() },
        ]);
      }
    } catch (error) {
      console.error("Error adding perfume:", error);
    } finally {
      setLoadingId(null);
      setSearchQuery("");
      clearResults();
      setIsAddingMode(false);
    }
  };

  const handleRemove = (id: string) => {
    setCollection((prev) => prev.filter((item) => item.perfume.id !== id));
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 bg-emerald-500/20";
    if (score >= 50) return "text-amber-400 bg-amber-500/20";
    return "text-rose-400 bg-rose-500/20";
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">My Collection</h3>
            <p className="text-xs text-zinc-500">
              {collection.length} perfume{collection.length !== 1 ? "s" : ""} • Ranked by compatibility
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Add button / Search */}
          <div className="p-4 border-b border-zinc-800/50">
            {!isAddingMode ? (
              <button
                onClick={() => setIsAddingMode(true)}
                className="w-full py-2.5 px-4 border border-dashed border-zinc-700 hover:border-violet-500 rounded-xl text-zinc-400 hover:text-violet-400 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add from my collection
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a perfume..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {results.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-700 divide-y divide-zinc-800">
                    {results.slice(0, 5).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleAddPerfume(result)}
                        disabled={loadingId === result.id}
                        className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left disabled:opacity-50"
                      >
                        {result.imageUrl && (
                          <img
                            src={result.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{result.name}</p>
                          <p className="text-xs text-zinc-500">{result.brand}</p>
                        </div>
                        {loadingId === result.id ? (
                          <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                        ) : collection.some((item) => item.perfume.id === result.id) ? (
                          <span className="text-xs text-zinc-500">Added</span>
                        ) : (
                          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsAddingMode(false);
                    setSearchQuery("");
                    clearResults();
                  }}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Collection List */}
          {rankedCollection.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {rankedCollection.map((item, index) => (
                <div
                  key={item.perfume.id}
                  className="p-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors group"
                >
                  {/* Rank */}
                  <div className="w-6 text-center">
                    <span className={`text-sm font-medium ${index === 0 ? "text-violet-400" : "text-zinc-500"}`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  {item.perfume.imageUrl ? (
                    <img
                      src={item.perfume.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-zinc-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.perfume.name}</p>
                    <p className="text-xs text-zinc-500">{item.perfume.brand}</p>
                  </div>

                  {/* Match Score */}
                  <div className={`px-2.5 py-1 rounded-lg text-sm font-medium ${getScoreColor(item.matchScore)}`}>
                    {item.matchScore}%
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSelectPairing(item.perfume)}
                      className="p-1.5 hover:bg-violet-500/20 rounded-lg text-zinc-400 hover:text-violet-400 transition-colors"
                      title="Use for layering"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemove(item.perfume.id)}
                      className="p-1.5 hover:bg-rose-500/20 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Remove from collection"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : collection.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-zinc-500 text-sm">
                Add perfumes from your collection to see how well they pair with {currentPerfume.name}
              </p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-zinc-500 text-sm">
                {currentPerfume.name} is the only perfume in your collection
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
