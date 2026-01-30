import { Perfume, SearchResult } from "./types";

const RAPIDAPI_HOST = "fragrance-api.p.rapidapi.com";

// Cache for results
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function getApiKey(): string {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }
  return key;
}

interface ApiNote {
  id: string;
  name: string;
}

interface ApiBrand {
  id: number;
  name: string;
}

interface ApiImage {
  url: string;
}

interface ApiFragrance {
  id: number;
  name: string;
  brand: ApiBrand;
  image?: ApiImage;
  reviewsScoreAvg?: number;
  reviewsCount?: number;
  notes?: ApiNote[];
  releasedAt?: number;
}

interface ApiSearchResponse {
  results: Array<{
    hits: ApiFragrance[];
    estimatedTotalHits?: number;
  }>;
}

async function searchApi(query: string, limit: number = 20): Promise<ApiFragrance[]> {
  const response = await fetch(`https://${RAPIDAPI_HOST}/multi-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    body: JSON.stringify({
      queries: [
        {
          indexUid: "fragrances",
          q: query,
          limit,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("API error:", error);
    throw new Error(`API error: ${response.status}`);
  }

  const data: ApiSearchResponse = await response.json();
  return data.results?.[0]?.hits || [];
}

function apiFragranceToPerfume(item: ApiFragrance): Perfume {
  const allNotes = item.notes || [];
  const third = Math.ceil(allNotes.length / 3);

  return {
    id: String(item.id),
    name: item.name,
    brand: item.brand?.name || "",
    imageUrl: item.image?.url,
    rating: item.reviewsScoreAvg,
    votes: item.reviewsCount,
    topNotes: allNotes.slice(0, third).map((n) => ({ name: n.name })),
    middleNotes: allNotes.slice(third, third * 2).map((n) => ({ name: n.name })),
    baseNotes: allNotes.slice(third * 2).map((n) => ({ name: n.name })),
  };
}

export async function searchFragrances(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query}`;
  const cached = getCached<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const hits = await searchApi(query, 20);

    const results: SearchResult[] = hits.map((item) => ({
      id: String(item.id),
      name: item.name,
      brand: item.brand?.name || "",
      imageUrl: item.image?.url,
      url: String(item.id),
    }));

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
}

export async function getFragranceById(id: string, nameHint?: string): Promise<Perfume | null> {
  const cacheKey = `perfume:${id}`;
  const cached = getCached<Perfume>(cacheKey);
  if (cached) return cached;

  try {
    // Search for the perfume - use name hint if available
    const searchTerm = nameHint || "";
    const hits = await searchApi(searchTerm, 50);

    // Find the one with matching ID
    let item = hits.find((h) => String(h.id) === id);

    // If not found by ID and we have a name hint, try name matching
    if (!item && nameHint) {
      item = hits.find(
        (h) =>
          h.name.toLowerCase().includes(nameHint.toLowerCase()) ||
          nameHint.toLowerCase().includes(h.name.toLowerCase())
      );
    }

    // Still not found? Use the first result
    if (!item && hits.length > 0) {
      item = hits[0];
    }

    if (!item) return null;

    const perfume = apiFragranceToPerfume(item);
    setCache(cacheKey, perfume);
    return perfume;
  } catch (error) {
    console.error("Error fetching fragrance:", error);
    return null;
  }
}

export async function getSimilarFragrances(id: string, perfumeName?: string): Promise<SearchResult[]> {
  const cacheKey = `similar:${id}`;
  const cached = getCached<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    // First get the perfume to find similar ones
    const perfume = await getFragranceById(id, perfumeName);
    if (!perfume) return [];

    // Search for fragrances with similar notes or from same brand
    const searchTerm = perfume.topNotes[0]?.name || perfume.brand || "";
    if (!searchTerm) return [];

    const hits = await searchApi(searchTerm, 15);

    // Filter out the original fragrance
    const results: SearchResult[] = hits
      .filter((h) => String(h.id) !== id)
      .slice(0, 10)
      .map((h) => ({
        id: String(h.id),
        name: h.name,
        brand: h.brand?.name || "",
        imageUrl: h.image?.url,
        url: String(h.id),
      }));

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("Error fetching similar fragrances:", error);
    return [];
  }
}
