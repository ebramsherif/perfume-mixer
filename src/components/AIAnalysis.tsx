"use client";

import { useState, useEffect } from "react";
import { Perfume, MatchAnalysis, AIAnalysisResult } from "@/lib/types";

interface AIAnalysisProps {
  perfume1: Perfume;
  perfume2: Perfume;
  matchAnalysis: MatchAnalysis;
}

export default function AIAnalysis({ perfume1, perfume2, matchAnalysis }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perfume1, perfume2, matchAnalysis }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analysis");
        }

        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (err) {
        setError("Unable to generate AI analysis. Please try again.");
        console.error("AI Analysis error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [perfume1, perfume2, matchAnalysis]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <div>
            <h3 className="font-semibold text-white">Analyzing Combination</h3>
            <p className="text-sm text-zinc-400">Our AI is evaluating these fragrances...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-rose-800/50 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-rose-400">Analysis Unavailable</h3>
            <p className="text-sm text-zinc-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-zinc-900/50 border border-purple-800/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-purple-800/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Expert Analysis</h3>
            <p className="text-xs text-zinc-500">Powered by fragrance expertise</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-5 border-b border-zinc-800/50">
        <p className="text-zinc-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-px bg-zinc-800/50">
        {/* Strengths */}
        <div className="bg-zinc-900/80 p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Strengths
          </h4>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-emerald-500 mt-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Considerations */}
        <div className="bg-zinc-900/80 p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Considerations
          </h4>
          <ul className="space-y-2">
            {analysis.considerations.map((consideration, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-amber-500 mt-1">•</span>
                {consideration}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Occasions */}
      <div className="p-5 border-t border-zinc-800/50">
        <h4 className="text-sm font-semibold text-blue-400 mb-3">Best Occasions</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.occasions.map((occasion, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-sm rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50"
            >
              {occasion}
            </span>
          ))}
        </div>
      </div>

      {/* Layering Tip */}
      <div className="p-5 bg-gradient-to-r from-purple-900/30 to-transparent border-t border-purple-800/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-purple-300">Pro Tip</h4>
            <p className="text-sm text-zinc-400 mt-1">{analysis.layeringTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
