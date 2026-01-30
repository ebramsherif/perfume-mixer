import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, SearchResult } from "@/lib/types";
import { searchFragrances } from "@/lib/fragranceApi";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function formatPerfumeForPrompt(perfume: Perfume): string {
  const topNotes = perfume.topNotes.map((n) => n.name).join(", ") || "unknown";
  const middleNotes = perfume.middleNotes.map((n) => n.name).join(", ") || "unknown";
  const baseNotes = perfume.baseNotes.map((n) => n.name).join(", ") || "unknown";

  return `**${perfume.name}** by ${perfume.brand}
- Top Notes (5-15 min): ${topNotes}
- Heart Notes (2-4 hrs): ${middleNotes}
- Base Notes (4-24+ hrs): ${baseNotes}`;
}

const SYSTEM_PROMPT = `You are "The Nose," an expert perfumer, olfactory chemist, and fragrance taxonomist. You analyze perfumes using the Jean Carles method and Michael Edwards Fragrance Wheel.

KNOWLEDGE BASE - VOLATILITY:
- Top Notes (Head): High volatility, 5-15 mins. (Citrus, Aromatics, Aldehydes) - The "Hook"
- Middle Notes (Heart): Medium volatility, 2-4 hours. (Florals, Spices, Fruits) - The "Theme"
- Base Notes (Dry Down): Low volatility, 4-24+ hours. (Woods, Resins, Musks, Vanilla) - The "Anchor"

OLFACTORY FAMILIES:
1. Floral: Single florals (Soliflore) or Bouquets
2. Oriental (Amber): Resins, Vanilla, Spices, Exotic Woods
3. Woody: Sandalwood, Cedar, Vetiver, Patchouli
4. Fresh: Citrus, Aquatic, Green, Fruity

SKELETON ACCORDS:
- Chypre: Bergamot (Top) + Labdanum (Heart) + Oakmoss (Base) - Earthy, Sophisticated
- Fougère: Lavender (Top) + Coumarin/Tonka (Base) + Oakmoss (Base) - Barbershop, Clean
- Gourmand: Edible notes (Vanilla, Caramel, Coffee) bridged with Patchouli or Musk

LAYERING PRINCIPLES:
- Bridge Technique: Find common "bridge" notes between perfumes, or suggest a connector (Musk, Iso E Super)
- Heavy-First Rule: Apply heaviest molecules (Woods/Orientals) first, lightest (Citrus/Florals) second

Respond ONLY with valid JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { perfume }: { perfume: Perfume } = body;

    if (!perfume) {
      return NextResponse.json(
        { error: "Perfume is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ resolved: [] });
    }

    const prompt = `Analyze this perfume and find LAYERING PARTNERS:

${formatPerfumeForPrompt(perfume)}

STEP 1 - DECONSTRUCTION:
Identify the Dominant Accord and Olfactory Family.

STEP 2 - MATCHING STRATEGY:
Find perfumes that would layer beautifully using:
- Vibe Match: Same family but different twist
- Structural Match: Same accord skeleton (Chypre pairs with Chypre, etc.)
- Bridge Match: Shares key bridge notes for seamless blending
- Contrast Match: Complementary family that creates interesting tension

STEP 3 - OUTPUT:
Give me 5 search terms to find complementary perfumes. Each term should be a specific note combination, accord type, or scent profile that would layer well.

Respond with this JSON ONLY:
{
  "analysis": {
    "dominantAccord": "e.g., Sandalwood/Leather accord",
    "family": "e.g., Woody Oriental",
    "signature": "The defining note or molecule"
  },
  "searches": [
    {
      "term": "search term for fragrance API",
      "matchType": "vibe|structural|bridge|contrast",
      "reason": "Why this creates a beautiful layer (mention bridge notes, accord compatibility)"
    }
  ]
}

Example search terms: "amber vanilla musk", "bergamot oakmoss chypre", "oud rose", "vetiver citrus", "tonka lavender fougere"`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    let analysis = null;
    let searches: Array<{ term: string; matchType: string; reason: string }> = [];

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = parsed.analysis;
        searches = parsed.searches || [];
      }
    } catch {
      // Fallback based on note analysis
      const allNotes = [...perfume.topNotes, ...perfume.middleNotes, ...perfume.baseNotes]
        .map(n => n.name.toLowerCase());

      // Detect family and suggest complementary searches
      const hasWoody = allNotes.some(n => /wood|cedar|sandalwood|vetiver|oud/.test(n));
      const hasCitrus = allNotes.some(n => /bergamot|lemon|orange|citrus|grapefruit/.test(n));
      const hasFloral = allNotes.some(n => /rose|jasmine|iris|violet|floral/.test(n));
      const hasOriental = allNotes.some(n => /vanilla|amber|incense|resin|benzoin/.test(n));
      const hasSpice = allNotes.some(n => /pepper|cardamom|cinnamon|saffron|spice/.test(n));

      if (hasWoody) {
        searches.push({ term: "rose oud", matchType: "bridge", reason: "Classic wood-floral bridge" });
        searches.push({ term: "amber vanilla", matchType: "structural", reason: "Warm oriental base complement" });
      }
      if (hasCitrus) {
        searches.push({ term: "vetiver musk", matchType: "contrast", reason: "Earthy base anchors bright citrus" });
        searches.push({ term: "neroli orange blossom", matchType: "vibe", reason: "Extends citrus with floral depth" });
      }
      if (hasFloral) {
        searches.push({ term: "sandalwood musk", matchType: "bridge", reason: "Creamy woods extend floral dry-down" });
        searches.push({ term: "bergamot chypre", matchType: "structural", reason: "Classic floral-chypre pairing" });
      }
      if (hasOriental) {
        searches.push({ term: "fresh citrus bergamot", matchType: "contrast", reason: "Brightens heavy oriental" });
        searches.push({ term: "oud wood", matchType: "vibe", reason: "Deepens oriental character" });
      }
      if (hasSpice) {
        searches.push({ term: "leather tobacco", matchType: "vibe", reason: "Enhances spicy masculinity" });
      }

      // Always include a universal bridge
      searches.push({ term: "white musk skin", matchType: "bridge", reason: "Universal connector note" });
    }

    // Search for perfumes matching these profiles
    const resolved: Array<SearchResult & { matchType: string; reason: string }> = [];
    const seenIds = new Set<string>([perfume.id]);

    for (const search of searches.slice(0, 5)) {
      try {
        const results = await searchFragrances(search.term);

        for (const result of results) {
          if (!seenIds.has(result.id) && resolved.length < 5) {
            seenIds.add(result.id);
            resolved.push({
              ...result,
              matchType: search.matchType,
              reason: search.reason,
            });
            break;
          }
        }
      } catch (e) {
        console.error("Error searching for:", search.term, e);
      }
    }

    return NextResponse.json({
      analysis,
      resolved
    });
  } catch (error) {
    console.error("AI pairings API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI pairings" },
      { status: 500 }
    );
  }
}
