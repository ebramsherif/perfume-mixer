"use client";

import { MatchAnalysis } from "@/lib/types";

interface MatchScoreProps {
  analysis: MatchAnalysis;
}

export default function MatchScore({ analysis }: MatchScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent Match";
    if (score >= 75) return "Great Match";
    if (score >= 60) return "Good Match";
    if (score >= 50) return "Fair Match";
    if (score >= 35) return "Challenging";
    return "Experimental";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 75) return "from-emerald-600 to-emerald-400";
    if (score >= 50) return "from-amber-600 to-amber-400";
    return "from-rose-600 to-rose-400";
  };

  const breakdownItems = [
    { label: "Note Overlap", value: analysis.breakdown.noteOverlap, description: "Shared notes create cohesion" },
    { label: "Family Harmony", value: analysis.breakdown.familyHarmony, description: "Scent family compatibility" },
    { label: "Layer Balance", value: analysis.breakdown.layerBalance, description: "Top/heart/base distribution" },
    { label: "Accord Blend", value: analysis.breakdown.accordBlend, description: "Overall character harmony" },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Main Score */}
      <div className="p-6 text-center border-b border-zinc-800">
        <div className="inline-flex flex-col items-center">
          <div className="relative w-32 h-32">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-zinc-800"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(analysis.score / 100) * 352} 352`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={analysis.score >= 75 ? "text-emerald-600" : analysis.score >= 50 ? "text-amber-600" : "text-rose-600"} stopColor="currentColor" />
                  <stop offset="100%" className={analysis.score >= 75 ? "text-emerald-400" : analysis.score >= 50 ? "text-amber-400" : "text-rose-400"} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score}
              </span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Score</span>
            </div>
          </div>
          <p className={`mt-3 font-semibold ${getScoreColor(analysis.score)}`}>
            {getScoreLabel(analysis.score)}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Score Breakdown
        </h4>
        <div className="space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-zinc-300">{item.label}</span>
                <span className="text-sm font-medium text-zinc-400">{item.value}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(item.value)} rounded-full transition-all duration-700`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Analysis */}
      <div className="px-5 pb-5 space-y-4">
        {analysis.sharedNotes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">
              Shared Notes ({analysis.sharedNotes.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.sharedNotes.map((note, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-700/50"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.complementaryNotes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">
              Complementary Notes
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.complementaryNotes.map((note, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.potentialClashes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2">
              Watch Out For
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.potentialClashes.map((clash, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-full bg-rose-900/30 text-rose-300 border border-rose-700/50"
                >
                  {clash}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
