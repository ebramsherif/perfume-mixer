"use client";

import { Perfume } from "@/lib/types";

interface PerfumeCardProps {
  perfume: Perfume;
  onRemove?: () => void;
  compact?: boolean;
}

export default function PerfumeCard({ perfume, onRemove, compact = false }: PerfumeCardProps) {
  const renderNotes = (notes: { name: string }[], type: "top" | "middle" | "base") => {
    if (notes.length === 0) return null;

    const colorClass = {
      top: "note-top",
      middle: "note-middle",
      base: "note-base",
    }[type];

    const label = {
      top: "Top",
      middle: "Heart",
      base: "Base",
    }[type];

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label} Notes
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {notes.slice(0, compact ? 5 : 10).map((note, i) => (
            <span key={i} className={`note-pill ${colorClass}`}>
              {note.name}
            </span>
          ))}
          {notes.length > (compact ? 5 : 10) && (
            <span className="note-pill bg-zinc-800 text-zinc-400 border border-zinc-700">
              +{notes.length - (compact ? 5 : 10)} more
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-start gap-4">
          {perfume.imageUrl && (
            <img
              src={perfume.imageUrl}
              alt={perfume.name}
              className="w-20 h-20 object-contain rounded-xl bg-zinc-800 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg text-white leading-tight">
                  {perfume.name}
                </h3>
                <p className="text-zinc-400 mt-0.5">{perfume.brand}</p>
              </div>
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {perfume.rating && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(perfume.rating!)
                          ? "text-amber-400"
                          : "text-zinc-700"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-zinc-400">
                  {perfume.rating.toFixed(1)}
                  {perfume.votes && ` (${perfume.votes.toLocaleString()} votes)`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="p-5 space-y-4">
        {renderNotes(perfume.topNotes, "top")}
        {renderNotes(perfume.middleNotes, "middle")}
        {renderNotes(perfume.baseNotes, "base")}

        {perfume.topNotes.length === 0 &&
          perfume.middleNotes.length === 0 &&
          perfume.baseNotes.length === 0 && (
            <p className="text-zinc-500 text-sm italic">
              Note information not available
            </p>
          )}
      </div>

      {/* Accords */}
      {perfume.accords && perfume.accords.length > 0 && (
        <div className="px-5 pb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Main Accords
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {perfume.accords.slice(0, 6).map((accord, i) => {
              const strength = perfume.accordPercentages?.[accord];
              const strengthClass = strength === "Dominant"
                ? "bg-amber-600/30 border-amber-500/50 text-amber-300"
                : strength === "Prominent"
                ? "bg-amber-600/20 border-amber-500/30 text-amber-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-300";
              return (
                <span
                  key={i}
                  className={`px-2.5 py-1 text-xs rounded-full border ${strengthClass}`}
                  title={strength || ""}
                >
                  {accord}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional info */}
      {(perfume.longevity || perfume.sillage) && (
        <div className="px-5 pb-5 flex gap-4 text-xs text-zinc-500">
          {perfume.longevity && (
            <span>Longevity: <span className="text-zinc-300">{perfume.longevity}</span></span>
          )}
          {perfume.sillage && (
            <span>Sillage: <span className="text-zinc-300">{perfume.sillage}</span></span>
          )}
        </div>
      )}
    </div>
  );
}
