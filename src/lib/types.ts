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
