"use client";

import { useState, useEffect } from "react";
import SearchBox from "@/components/SearchBox";
import PerfumeCard from "@/components/PerfumeCard";
import MatchScore from "@/components/MatchScore";
import AIAnalysis from "@/components/AIAnalysis";
import Recommendations from "@/components/Recommendations";
import { Perfume, SearchResult, MatchAnalysis } from "@/lib/types";
import { calculateMatch } from "@/lib/matchAlgorithm";

type SelectionState = "search1" | "loading1" | "display1" | "search2" | "loading2" | "display2";

export default function Home() {
  const [state, setState] = useState<SelectionState>("search1");
  const [perfume1, setPerfume1] = useState<Perfume | null>(null);
  const [perfume2, setPerfume2] = useState<Perfume | null>(null);
  const [recommendations1, setRecommendations1] = useState<SearchResult[]>([]);
  const [recommendations2, setRecommendations2] = useState<SearchResult[]>([]);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [showSearch2, setShowSearch2] = useState(false);

  // Calculate match when both perfumes are selected
  useEffect(() => {
    if (perfume1 && perfume2) {
      const analysis = calculateMatch(perfume1, perfume2);
      setMatchAnalysis(analysis);
    } else {
      setMatchAnalysis(null);
    }
  }, [perfume1, perfume2]);

  const fetchPerfumeDetails = async (result: SearchResult, slot: 1 | 2) => {
    setState(slot === 1 ? "loading1" : "loading2");

    try {
      const response = await fetch(`/api/perfume?url=${encodeURIComponent(result.url)}&name=${encodeURIComponent(result.name)}`);
      const data = await response.json();

      if (data.error) {
        console.error("API error:", data.error);
        setState(slot === 1 ? "search1" : "display1");
        return;
      }

      if (data.perfume) {
        if (slot === 1) {
          setPerfume1(data.perfume);
          setRecommendations1(data.similar || []);
          setState("display1");
        } else {
          setPerfume2(data.perfume);
          setRecommendations2(data.similar || []);
          setState("display2");
        }
      } else {
        console.error("Perfume not found in response");
        setState(slot === 1 ? "search1" : "display1");
      }
    } catch (error) {
      console.error("Error fetching perfume:", error);
      setState(slot === 1 ? "search1" : "display1");
    }
  };

  const handleSelect1 = (result: SearchResult) => {
    fetchPerfumeDetails(result, 1);
  };

  const handleSelect2 = (result: SearchResult) => {
    fetchPerfumeDetails(result, 2);
    setShowSearch2(false);
  };

  const handleRecommendationSelect = (result: SearchResult) => {
    fetchPerfumeDetails(result, 2);
    setShowSearch2(false);
  };

  const handleRemove1 = () => {
    setPerfume1(null);
    setPerfume2(null);
    setRecommendations1([]);
    setRecommendations2([]);
    setMatchAnalysis(null);
    setShowSearch2(false);
    setState("search1");
  };

  const handleRemove2 = () => {
    setPerfume2(null);
    setRecommendations2([]);
    setMatchAnalysis(null);
    setState("display1");
  };

  const isLoading = state === "loading1" || state === "loading2";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Perfume Mixer</h1>
                <p className="text-xs text-zinc-500">Find your perfect fragrance combination</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Initial Search State */}
        {!perfume1 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start with a Perfume</h2>
            <p className="text-zinc-400 mb-8 max-w-md">
              Search for a fragrance you own or love, and we&apos;ll help you find the perfect companion for layering.
            </p>
            <SearchBox
              onSelect={handleSelect1}
              placeholder="Search for a perfume (e.g., Bleu de Chanel)"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
            <p className="text-zinc-400">Loading perfume details...</p>
          </div>
        )}

        {/* Single Perfume Selected */}
        {perfume1 && !perfume2 && !isLoading && (
          <div className="space-y-8">
            <div className="max-w-2xl mx-auto">
              <PerfumeCard perfume={perfume1} onRemove={handleRemove1} />
            </div>

            {/* Add Second Perfume Section */}
            <div className="text-center py-8 border-y border-zinc-800/50">
              <h3 className="text-lg font-semibold text-white mb-2">Add a Perfume to Mix</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Select from recommendations below or search for a specific fragrance
              </p>

              {!showSearch2 ? (
                <button
                  onClick={() => setShowSearch2(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search for a Perfume
                </button>
              ) : (
                <div className="max-w-xl mx-auto">
                  <SearchBox
                    onSelect={handleSelect2}
                    placeholder="Search for a second perfume..."
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => setShowSearch2(false)}
                    className="mt-3 text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {recommendations1.length > 0 && (
              <Recommendations
                recommendations={recommendations1}
                onSelect={handleRecommendationSelect}
                title="Similar Perfumes - Click to Add"
              />
            )}
          </div>
        )}

        {/* Both Perfumes Selected */}
        {perfume1 && perfume2 && !isLoading && (
          <div className="space-y-8">
            {/* Perfume Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              <PerfumeCard perfume={perfume1} onRemove={handleRemove1} />
              <PerfumeCard perfume={perfume2} onRemove={handleRemove2} />
            </div>

            {/* Match Analysis */}
            {matchAnalysis && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <MatchScore analysis={matchAnalysis} />
                </div>
                <div className="md:col-span-2">
                  <AIAnalysis
                    perfume1={perfume1}
                    perfume2={perfume2}
                    matchAnalysis={matchAnalysis}
                  />
                </div>
              </div>
            )}

            {/* Try Different Combinations */}
            <div className="text-center py-6 border-t border-zinc-800/50">
              <button
                onClick={() => setShowSearch2(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try a Different Combination
              </button>
            </div>

            {/* Search for replacement */}
            {showSearch2 && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 rounded-2xl p-6 max-w-xl w-full">
                  <h3 className="text-lg font-semibold text-white mb-4">Search for a Different Perfume</h3>
                  <SearchBox
                    onSelect={handleSelect2}
                    placeholder="Search for a perfume..."
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => setShowSearch2(false)}
                    className="mt-4 w-full py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Combined Recommendations */}
            {(recommendations1.length > 0 || recommendations2.length > 0) && (
              <div className="grid md:grid-cols-2 gap-6">
                {recommendations1.length > 0 && (
                  <Recommendations
                    recommendations={recommendations1}
                    onSelect={handleRecommendationSelect}
                    title={`Similar to ${perfume1.name}`}
                  />
                )}
                {recommendations2.length > 0 && (
                  <Recommendations
                    recommendations={recommendations2}
                    onSelect={handleRecommendationSelect}
                    title={`Similar to ${perfume2.name}`}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-zinc-500 text-sm">
          <p>Perfume data from Fragrance API. This tool is for educational purposes only.</p>
        </div>
      </footer>
    </main>
  );
}
