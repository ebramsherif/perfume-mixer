"use client";

import { useState, useEffect } from "react";
import { Perfume, SearchResult } from "@/lib/types";

interface AIPairingsProps {
  perfume: Perfume;
  onSelect: (result: SearchResult) => void;
}

interface Analysis {
  dominantAccord: string;
  family: string;
  signature: string;
}

interface ResolvedPairing extends SearchResult {
  matchType: string;
  reason: string;
}

const MATCH_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  vibe: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Vibe" },
  structural: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Structure" },
  bridge: { bg: "bg-green-500/20", text: "text-green-400", label: "Bridge" },
  contrast: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Contrast" },
};

export default function AIPairings({ perfume, onSelect }: AIPairingsProps) {
  const [pairings, setPairings] = useState<ResolvedPairing[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPairings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-pairings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfume }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setPairings(data.resolved || []);
      setAnalysis(data.analysis || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfume.id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <div>
            <h3 className="font-semibold text-white">The Nose is analyzing...</h3>
            <p className="text-sm text-zinc-400">Deconstructing olfactory structure</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || pairings.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-purple-500/20">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Layering Partners
        </h3>

        {/* Analysis Card */}
        {analysis && (
          <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Analysis</div>
            <div className="space-y-1 text-sm">
              <p><span className="text-zinc-500">Family:</span> <span className="text-purple-300">{analysis.family}</span></p>
              <p><span className="text-zinc-500">Accord:</span> <span className="text-zinc-300">{analysis.dominantAccord}</span></p>
              {analysis.signature && (
                <p><span className="text-zinc-500">Signature:</span> <span className="text-zinc-400">{analysis.signature}</span></p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="grid gap-3">
          {pairings.map((pairing) => {
            const style = MATCH_TYPE_STYLES[pairing.matchType] || MATCH_TYPE_STYLES.bridge;

            return (
              <button
                key={pairing.id}
                onClick={() => onSelect(pairing)}
                className="flex items-start gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-purple-500/50 rounded-xl transition-all text-left group"
              >
                {pairing.imageUrl ? (
                  <img
                    src={pairing.imageUrl}
                    alt={pairing.name}
                    className="w-12 h-12 object-contain rounded-lg bg-zinc-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                      {pairing.name}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{pairing.brand}</p>
                  <p className="text-xs text-purple-400/80 mt-1 line-clamp-2">{pairing.reason}</p>
                </div>

                <svg className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-zinc-600 text-center">
          Based on Jean Carles method & Edwards Fragrance Wheel
        </p>
      </div>
    </div>
  );
}
