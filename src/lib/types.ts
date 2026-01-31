export interface PerfumeNote {
  name: string;
  intensity?: number; // 0-100, if available
  imageUrl?: string;
}

export interface Perfume {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  url?: string;
  rating?: number;
  votes?: number;
  topNotes: PerfumeNote[];
  middleNotes: PerfumeNote[];
  baseNotes: PerfumeNote[];
  accords?: string[];
  accordPercentages?: Record<string, string>; // e.g., { "vanilla": "Dominant" }
  longevity?: string;
  sillage?: string;
  year?: string;
  gender?: string;
  perfumer?: string;
  concentration?: string; // EDP, EDT, Parfum, etc.
  // Data source info
  source?: "fragrantica" | "rapidapi";
}

export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  url: string;
}

export interface MatchAnalysis {
  score: number; // 0-100
  breakdown: {
    noteOverlap: number;
    familyHarmony: number;
    layerBalance: number;
    accordBlend: number;
  };
  sharedNotes: string[];
  complementaryNotes: string[];
  potentialClashes: string[];
}

export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  considerations: string[];
  occasions: string[];
  layeringTip: string;
}

export type SprayLocation = "wrists" | "neck" | "chest" | "behind_ears" | "inner_elbows" | "hair" | "clothes";

export interface LayeringStep {
  order: number;
  perfume: "first" | "second";
  location: SprayLocation;
  sprays: number;
  waitTime?: number; // seconds to wait before next step
  tip?: string;
}

export interface LayeringGuide {
  steps: LayeringStep[];
  totalSprays: { first: number; second: number };
  estimatedDuration: string;
  intensityLevel: "subtle" | "moderate" | "bold";
  proTip: string;
}

export interface AIPairing {
  name: string;
  brand: string;
  reason: string;
}
