import { Perfume, SearchResult } from "./types";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

// Cache for results (separate from v1 cache)
const cacheV2 = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour (longer since scraping is expensive)

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

function getCached<T>(key: string): T | null {
  const cached = cacheV2.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cacheV2.set(key, { data, timestamp: Date.now() });
}

function getFirecrawlKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set");
  }
  return key;
}

// Rate limiter - ensures minimum time between requests
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

async function firecrawlScrape(
  url: string,
  format: "markdown" | "html" = "html",
  waitFor: number = 3000,
  retries: number = 2
): Promise<FirecrawlResponse> {
  await waitForRateLimit();

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getFirecrawlKey()}`,
    },
    body: JSON.stringify({
      url,
      formats: [format],
      onlyMainContent: true,
      waitFor,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Firecrawl API error:", error);

    // Retry on 5xx errors (server errors)
    if (response.status >= 500 && retries > 0) {
      console.log(`[Firecrawl] Retrying (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return firecrawlScrape(url, format, waitFor, retries - 1);
    }

    throw new Error(`Firecrawl API error: ${response.status}`);
  }

  return response.json();
}

// Parse search results from Fragrantica markdown
function parseSearchResultsFromMarkdown(markdown: string): SearchResult[] {
  const results: SearchResult[] = [];

  // First, extract all image URLs (they appear before the perfume links)
  // Pattern: ![](https://fimgs.net/mdimg/perfume/m.12345.jpg)
  const imageMap = new Map<string, string>();
  const imagePattern = /!\[\]\((https:\/\/fimgs\.net\/mdimg\/perfume\/m\.(\d+)\.jpg)\)/gi;
  let imgMatch;
  while ((imgMatch = imagePattern.exec(markdown)) !== null) {
    const [, imageUrl, id] = imgMatch;
    imageMap.set(id, imageUrl);
  }

  // Pattern: Image followed by link and brand on next line
  // ![](https://fimgs.net/mdimg/perfume/m.99116.jpg)
  // [Eros Najim](https://www.fragrantica.com/perfume/Versace/Eros-Najim-99116.html)
  // Versace
  const blockPattern = /!\[\]\((https:\/\/fimgs\.net\/mdimg\/perfume\/m\.(\d+)\.jpg)\)\s*\n\s*\[([^\]]+)\]\(https:\/\/www\.fragrantica\.com\/perfume\/([^/]+)\/([^)]+)\.html\)\s*\n\s*([A-Za-z][^\n]*)/gi;

  let match;
  while ((match = blockPattern.exec(markdown)) !== null) {
    const [, imageUrl, id, displayName, brandSlug, nameSlug, brandLine] = match;

    const brand = brandLine.trim() || decodeURIComponent(brandSlug.replace(/-/g, " "));
    const name = displayName.trim();

    if (!name || !brand) continue;

    results.push({
      id,
      name: decodeURIComponent(name),
      brand,
      imageUrl,
      url: `https://www.fragrantica.com/perfume/${brandSlug}/${nameSlug}.html`,
    });
  }

  // Fallback: Just find links without the block pattern
  if (results.length === 0) {
    const linkPattern = /\[([^\]]+)\]\(https:\/\/www\.fragrantica\.com\/perfume\/([^/]+)\/([^)]+)-(\d+)\.html\)/gi;
    while ((match = linkPattern.exec(markdown)) !== null) {
      const [, displayName, brandSlug, , id] = match;

      const brand = decodeURIComponent(brandSlug.replace(/-/g, " "));
      const name = displayName.trim();
      const imageUrl = imageMap.get(id);

      if (!name || !brand) continue;

      results.push({
        id,
        name: decodeURIComponent(name),
        brand,
        imageUrl,
        url: `https://www.fragrantica.com/perfume/${brandSlug}/${displayName.replace(/\s+/g, "-")}-${id}.html`,
      });
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.id.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

// Parse perfume details from Fragrantica markdown
function parsePerfumeDetails(markdown: string, searchResult: SearchResult): Perfume {
  const perfume: Perfume = {
    id: searchResult.id,
    name: searchResult.name,
    brand: searchResult.brand,
    imageUrl: searchResult.imageUrl,
    url: searchResult.url,
    topNotes: [],
    middleNotes: [],
    baseNotes: [],
    accords: [],
  };

  // Extract title and gender from "# Name Brand for men/women"
  const titleMatch = markdown.match(/^#\s+(.+?)\s+for\s+(men|women|unisex)/im);
  if (titleMatch) {
    perfume.gender = titleMatch[2].toLowerCase();
  }

  // Extract higher quality image from markdown
  const imageMatch = markdown.match(/!\[perfume[^\]]*\]\((https:\/\/fimgs\.net\/mdimg\/perfume[^)]+)\)/i);
  if (imageMatch) {
    perfume.imageUrl = imageMatch[1];
  }

  // Extract main accords - they appear after "###### main accords" as line-separated items
  const accordsSection = markdown.match(/###### main accords\s*([\s\S]*?)(?=\n\n\n|\n#{1,5}\s|\nUser\s|\nWhen\s|Perfume rating|Online shop)/i);
  if (accordsSection) {
    const invalidAccords = ['sponsored', 'online', 'shop', 'offers', 'rating', 'buy', 'price', 'sale'];
    const accordLines = accordsSection[1].split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line =>
        line.length > 2 &&
        line.length < 25 &&
        !line.startsWith('#') &&
        !line.startsWith('[') &&
        !line.startsWith('!') &&
        !line.match(/^\d/) &&
        !line.includes('http') &&
        !line.includes(':') &&
        /^[a-z]/.test(line) &&
        !invalidAccords.some(inv => line.includes(inv))
      )
      .slice(0, 10); // Max 10 accords
    perfume.accords = accordLines;
  }

  // Extract notes from prose description
  // Format: "Top note is X; middle notes are Y, Z and W; base notes are A and B."
  // Or: "Top notes are X, Y and Z; middle notes are..."
  const topMatch = markdown.match(/top\s+notes?\s+(?:is|are)\s+([^;.]+?)(?:;|\.|\s+middle|\s+heart)/i);
  if (topMatch) {
    perfume.topNotes = parseNotesFromText(topMatch[1]);
  }

  const middleMatch = markdown.match(/(?:middle|heart)\s+notes?\s+(?:is|are)\s+([^;.]+?)(?:;|\.|\s+base)/i);
  if (middleMatch) {
    perfume.middleNotes = parseNotesFromText(middleMatch[1]);
  }

  const baseMatch = markdown.match(/base\s+notes?\s+(?:is|are)\s+([^;.]+?)(?:;|\.)/i);
  if (baseMatch) {
    perfume.baseNotes = parseNotesFromText(baseMatch[1]);
  }

  // Fallback: Look for notes as markdown links or in any format if prose parsing failed
  if (perfume.topNotes.length === 0 && perfume.middleNotes.length === 0 && perfume.baseNotes.length === 0) {
    // Try finding notes from any links to /notes/ pages
    const noteLinks = [...markdown.matchAll(/\[([^\]]+)\]\([^)]*\/notes\/[^)]+\)/gi)];
    let allNotes = noteLinks
      .map(m => m[1].trim())
      .filter(n => n.length > 1 && n.length < 40 && !n.includes('!') && /^[A-Za-z]/.test(n))
      .map(name => ({ name }));

    // Dedupe
    const seen = new Set<string>();
    allNotes = allNotes.filter(n => {
      const key = n.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (allNotes.length > 0) {
      const third = Math.ceil(allNotes.length / 3);
      perfume.topNotes = allNotes.slice(0, third);
      perfume.middleNotes = allNotes.slice(third, third * 2);
      perfume.baseNotes = allNotes.slice(third * 2);
    }
  }

  // Extract rating - specifically look for "Perfume rating X.XX out of 5"
  const ratingMatch = markdown.match(/(?:Perfume\s+)?rating\s+(\d+\.\d+)\s+out\s+of\s+5/i);
  if (ratingMatch) {
    perfume.rating = parseFloat(ratingMatch[1]);
  }

  // Extract votes from "X votes" or "with X,XXX votes"
  const votesMatch = markdown.match(/(?:with\s+)?(\d{1,3}(?:,\d{3})*)\s+votes/i);
  if (votesMatch) {
    perfume.votes = parseInt(votesMatch[1].replace(/,/g, ""), 10);
  }

  // Extract year - look for 4-digit year near "launched" or in title
  const yearMatch = markdown.match(/(?:launched|released|from|in)\s*(\d{4})/i) ||
                    markdown.match(/\b(19\d{2}|20[0-2]\d)\b/);
  if (yearMatch) {
    perfume.year = yearMatch[1];
  }

  // Extract longevity
  const longevityMatch = markdown.match(/longevity[:\s]*(very weak|weak|moderate|long lasting|very long lasting|eternal)/i);
  if (longevityMatch) {
    perfume.longevity = longevityMatch[1];
  }

  // Extract sillage
  const sillageMatch = markdown.match(/sillage[:\s]*(intimate|soft|moderate|heavy|enormous)/i);
  if (sillageMatch) {
    perfume.sillage = sillageMatch[1];
  }

  // Extract perfumer - "The nose behind this fragrance is X" or from Perfumer section
  const perfumerMatch = markdown.match(/(?:nose behind this fragrance is|created by|perfumer[:\s]*)\s*(?:\*\*)?([A-Z][a-zA-Zéèêëàâäùûüôöîïç\s\-']+?)(?:\*\*)?(?:\.|,|\s+Top|\s+Middle|\s+Base|\n)/i);
  if (perfumerMatch) {
    // Clean up any markdown artifacts
    perfume.perfumer = perfumerMatch[1].trim().replace(/^\[|\]$/g, '').replace(/!\[.*$/, '');
  }
  // Fallback: look for perfumer link
  if (!perfume.perfumer) {
    const perfumerLinkMatch = markdown.match(/### Perfumer[\s\S]*?\[([A-Z][a-zA-Zéèêëàâäùûüôöîïç\s\-']+)\]\(/i);
    if (perfumerLinkMatch) {
      perfume.perfumer = perfumerLinkMatch[1].trim();
    }
  }

  // Mark source
  perfume.source = "fragrantica";

  console.log(`[Parser] Parsed perfume: ${perfume.name}, accords: ${perfume.accords?.length}, top: ${perfume.topNotes.length}, mid: ${perfume.middleNotes.length}, base: ${perfume.baseNotes.length}`);

  return perfume;
}

// Parse notes from prose text like "Lavender, Iris, Ambrette (Musk Mallow) and Pear"
function parseNotesFromText(text: string): { name: string }[] {
  // Remove markdown links but keep the text: [Note](url) -> Note
  const cleanText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Split by comma, "and", semicolon
  const parts = cleanText.split(/,|;|\s+and\s+/i);

  return parts
    .map(p => p.trim())
    .filter(p => p.length > 1 && p.length < 50)
    .filter(p => !p.match(/^(is|are|the|a|an)$/i)) // Remove articles
    .map(name => ({ name }));
}

export async function searchFragrancesV2(query: string): Promise<SearchResult[]> {
  const cacheKey = `search-v2:${query.toLowerCase()}`;
  const cached = getCached<SearchResult[]>(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`[Search V2] Cache hit for: ${query}`);
    return cached;
  }

  try {
    // Use legacy display mode for simpler HTML
    const searchUrl = `https://www.fragrantica.com/search/?display=old&query=${encodeURIComponent(query)}`;

    console.log(`[Search V2] Scraping: ${searchUrl}`);
    const response = await firecrawlScrape(searchUrl, "markdown", 2000);

    if (!response.success || !response.data?.markdown) {
      console.error("[Search V2] Firecrawl failed:", response.error);
      throw new Error(response.error || "Failed to scrape search results");
    }

    const markdown = response.data.markdown;
    const results = parseSearchResultsFromMarkdown(markdown);
    console.log(`[Search V2] Found ${results.length} results for: ${query}`);

    // Only cache non-empty results
    if (results.length > 0) {
      setCache(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error("[Search V2] Error:", error);
    throw error;
  }
}

export async function getFragranceByIdV2(
  searchResult: SearchResult
): Promise<Perfume | null> {
  const cacheKey = `perfume-v2:${searchResult.id}`;
  const cached = getCached<Perfume>(cacheKey);
  if (cached) {
    console.log(`[Search V2] Cache hit for perfume: ${searchResult.name}`);
    return cached;
  }

  try {
    // Ensure we have a full URL
    const url = searchResult.url.startsWith("http")
      ? searchResult.url
      : `https://www.fragrantica.com${searchResult.url}`;

    console.log(`[Search V2] Scraping perfume details: ${url}`);
    const response = await firecrawlScrape(url, "markdown", 2500);

    if (!response.success || !response.data?.markdown) {
      console.error("[Search V2] Firecrawl failed:", response.error);
      throw new Error(response.error || "Failed to scrape perfume details");
    }

    const markdown = response.data.markdown;
    const perfume = parsePerfumeDetails(markdown, searchResult);
    setCache(cacheKey, perfume);
    return perfume;
  } catch (error) {
    console.error("[Search V2] Error fetching perfume:", error);

    // Return a basic perfume with the data we have from the search result
    // This ensures the user can still see the perfume even if scraping fails
    const fallbackPerfume: Perfume = {
      id: searchResult.id,
      name: searchResult.name,
      brand: searchResult.brand,
      imageUrl: searchResult.imageUrl,
      url: searchResult.url,
      topNotes: [],
      middleNotes: [],
      baseNotes: [],
      accords: [],
      source: "fragrantica",
    };

    console.log(`[Search V2] Using fallback perfume data for: ${searchResult.name}`);
    return fallbackPerfume;
  }
}

// Export cache utilities for testing
export function getCacheStats() {
  return {
    size: cacheV2.size,
    keys: Array.from(cacheV2.keys()),
  };
}

export function clearCache() {
  cacheV2.clear();
}
