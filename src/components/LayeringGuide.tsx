"use client";

import { useState, useEffect } from "react";
import { Perfume, LayeringGuide as LayeringGuideType, LayeringStep, SprayLocation } from "@/lib/types";

interface LayeringGuideProps {
  perfume1: Perfume;
  perfume2: Perfume;
}

const LOCATION_LABELS: Record<SprayLocation, string> = {
  wrists: "Wrists",
  neck: "Neck",
  chest: "Chest",
  behind_ears: "Behind Ears",
  inner_elbows: "Inner Elbows",
  hair: "Hair",
  clothes: "Clothes",
};

const LOCATION_POSITIONS: Record<SprayLocation, { x: number; y: number }> = {
  wrists: { x: 20, y: 65 },
  neck: { x: 50, y: 18 },
  chest: { x: 50, y: 35 },
  behind_ears: { x: 35, y: 12 },
  inner_elbows: { x: 25, y: 50 },
  hair: { x: 50, y: 5 },
  clothes: { x: 50, y: 55 },
};

function BodyDiagram({ activeLocations, perfume1Name, perfume2Name }: {
  activeLocations: Array<{ location: SprayLocation; perfume: "first" | "second" }>;
  perfume1Name: string;
  perfume2Name: string;
}) {
  return (
    <div className="relative w-32 h-48 mx-auto">
      {/* Simple body silhouette */}
      <svg viewBox="0 0 100 150" className="w-full h-full text-zinc-700">
        {/* Head */}
        <circle cx="50" cy="15" r="12" fill="currentColor" />
        {/* Neck */}
        <rect x="45" y="27" width="10" height="8" fill="currentColor" />
        {/* Torso */}
        <path d="M30 35 L70 35 L65 90 L35 90 Z" fill="currentColor" />
        {/* Arms */}
        <path d="M30 35 L15 70 L20 72 L32 45" fill="currentColor" />
        <path d="M70 35 L85 70 L80 72 L68 45" fill="currentColor" />
        {/* Legs */}
        <path d="M35 90 L30 140 L40 140 L45 95" fill="currentColor" />
        <path d="M65 90 L70 140 L60 140 L55 95" fill="currentColor" />
      </svg>

      {/* Spray indicators */}
      {activeLocations.map((loc, i) => {
        const pos = LOCATION_POSITIONS[loc.location];
        const color = loc.perfume === "first" ? "bg-amber-500" : "bg-rose-500";
        return (
          <div
            key={i}
            className={`absolute w-4 h-4 ${color} rounded-full animate-pulse shadow-lg`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            title={`${loc.perfume === "first" ? perfume1Name : perfume2Name} - ${LOCATION_LABELS[loc.location]}`}
          />
        );
      })}

      {/* Legend */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-zinc-400 truncate max-w-[60px]">{perfume1Name.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-rose-500 rounded-full" />
          <span className="text-zinc-400 truncate max-w-[60px]">{perfume2Name.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, perfume1Name, perfume2Name, isActive, isComplete }: {
  step: LayeringStep;
  perfume1Name: string;
  perfume2Name: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  const perfumeName = step.perfume === "first" ? perfume1Name : perfume2Name;
  const accentColor = step.perfume === "first" ? "amber" : "rose";

  return (
    <div
      className={`
        relative p-4 rounded-xl border transition-all duration-500
        ${isActive
          ? `bg-${accentColor}-500/10 border-${accentColor}-500/50 scale-105`
          : isComplete
            ? "bg-zinc-800/50 border-zinc-700 opacity-60"
            : "bg-zinc-900/50 border-zinc-800 opacity-40"
        }
      `}
    >
      {/* Step number */}
      <div
        className={`
          absolute -left-3 -top-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
          ${isComplete
            ? "bg-green-500 text-white"
            : isActive
              ? step.perfume === "first" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
              : "bg-zinc-700 text-zinc-400"
          }
        `}
      >
        {isComplete ? "✓" : step.order}
      </div>

      <div className="ml-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${step.perfume === "first" ? "text-amber-400" : "text-rose-400"}`}>
            {perfumeName}
          </span>
          <span className="text-zinc-500">→</span>
          <span className="text-white font-medium">{LOCATION_LABELS[step.location]}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{step.sprays} spray{step.sprays > 1 ? "s" : ""}</span>
          {step.waitTime && step.waitTime > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Wait {step.waitTime}s
            </span>
          )}
        </div>

        {step.tip && (
          <p className="mt-2 text-xs text-zinc-500 italic">💡 {step.tip}</p>
        )}
      </div>
    </div>
  );
}

export default function LayeringGuide({ perfume1, perfume2 }: LayeringGuideProps) {
  const [guide, setGuide] = useState<LayeringGuideType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intensity, setIntensity] = useState<"subtle" | "moderate" | "bold">("moderate");

  const fetchGuide = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep(0);
    setIsPlaying(false);

    try {
      const response = await fetch("/api/layering-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfume1, perfume2, intensity }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setGuide(data.guide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guide");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, [perfume1.id, perfume2.id, intensity]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || !guide) return;

    const timer = setTimeout(() => {
      if (currentStep < guide.steps.length - 1) {
        const currentStepData = guide.steps[currentStep];
        const delay = (currentStepData.waitTime || 0) * 50 + 1500; // Faster for demo
        setTimeout(() => setCurrentStep(s => s + 1), delay);
      } else {
        setIsPlaying(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, guide]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-zinc-400">Creating your layering guide...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button onClick={fetchGuide} className="text-amber-400 hover:text-amber-300 text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!guide) return null;

  const activeLocations = guide.steps
    .slice(0, currentStep + 1)
    .map(s => ({ location: s.location, perfume: s.perfume }));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Layering Guide
          </h3>

          {/* Intensity selector */}
          <div className="flex gap-1">
            {(["subtle", "moderate", "bold"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setIntensity(level)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  intensity === level
                    ? "bg-amber-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-zinc-500 mt-1">
          {guide.estimatedDuration} • {guide.totalSprays.first + guide.totalSprays.second} total sprays
        </p>
      </div>

      <div className="p-5">
        <div className="grid md:grid-cols-[1fr,180px] gap-6">
          {/* Steps */}
          <div className="space-y-3">
            {guide.steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                perfume1Name={perfume1.name}
                perfume2Name={perfume2.name}
                isActive={i === currentStep}
                isComplete={i < currentStep}
              />
            ))}
          </div>

          {/* Body diagram */}
          <div className="flex flex-col items-center gap-4">
            <BodyDiagram
              activeLocations={activeLocations}
              perfume1Name={perfume1.name}
              perfume2Name={perfume2.name}
            />

            {/* Controls */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setIsPlaying(true);
                }}
                disabled={isPlaying}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(guide.steps.length - 1, currentStep + 1))}
                disabled={currentStep === guide.steps.length - 1}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Pro tip */}
        <div className="mt-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-300">
            <span className="font-semibold">Pro tip:</span> {guide.proTip}
          </p>
        </div>
      </div>
    </div>
  );
}
