import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, SearchResult } from "@/lib/types";
import { searchFragrances } from "@/lib/fragranceApi";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function formatPerfumeForPrompt(perfume: Perfume): string {
  const topNotes = perfume.topNotes.map((n) => n.name).join(", ") || "none";
  const middleNotes = perfume.middleNotes.map((n) => n.name).join(", ") || "none";
  const baseNotes = perfume.baseNotes.map((n) => n.name).join(", ") || "none";

  return `${perfume.name} by ${perfume.brand}
Top: ${topNotes}
Heart: ${middleNotes}
Base: ${baseNotes}`;
}

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

    // Step 1: Ask Groq what NOTE PROFILES would complement this perfume
    const prompt = `You are a fragrance layering expert. Given this perfume:

${formatPerfumeForPrompt(perfume)}

What types of fragrances would layer BEAUTIFULLY with it? Think about:
- Complementary scent families (not the same, but harmonious)
- Notes that would fill gaps in the fragrance pyramid
- Classic layering combinations that work

Give me 5 SEARCH TERMS I can use to find complementary perfumes. Each should be a note, accord, or scent family - NOT a specific perfume name.

Respond ONLY with this JSON:
{
  "searches": [
    { "term": "vanilla amber", "reason": "warm base to complement the fresh top" },
    { "term": "oud woody", "reason": "adds depth and sophistication" }
  ]
}

Be specific with terms like: "fresh citrus", "creamy sandalwood", "spicy cardamom", "powdery iris", "sweet gourmand", "smoky incense", etc.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a fragrance expert. Respond with valid JSON only. Focus on complementary notes and accords, not specific perfume names.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    let searches: Array<{ term: string; reason: string }> = [];
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        searches = parsed.searches || [];
      }
    } catch {
      // Fallback searches based on common complementary profiles
      const notes = [...perfume.topNotes, ...perfume.middleNotes, ...perfume.baseNotes].map(n => n.name.toLowerCase());

      if (notes.some(n => n.includes("citrus") || n.includes("bergamot") || n.includes("lemon"))) {
        searches.push({ term: "vanilla woody", reason: "warm base for citrus" });
      }
      if (notes.some(n => n.includes("vanilla") || n.includes("amber"))) {
        searches.push({ term: "fresh citrus", reason: "brightens sweet base" });
      }
      if (notes.some(n => n.includes("oud") || n.includes("wood"))) {
        searches.push({ term: "rose floral", reason: "classic oud pairing" });
      }
      searches.push({ term: "musk sandalwood", reason: "universal complement" });
    }

    // Step 2: Search for perfumes matching these profiles
    const resolved: Array<SearchResult & { reason: string }> = [];
    const seenIds = new Set<string>([perfume.id]);

    for (const search of searches.slice(0, 5)) {
      try {
        const results = await searchFragrances(search.term);

        for (const result of results) {
          if (!seenIds.has(result.id) && resolved.length < 6) {
            seenIds.add(result.id);
            resolved.push({
              ...result,
              reason: search.reason,
            });
            break; // One per search term
          }
        }
      } catch (e) {
        console.error("Error searching for:", search.term, e);
      }
    }

    return NextResponse.json({ resolved });
  } catch (error) {
    console.error("AI pairings API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI pairings" },
      { status: 500 }
    );
  }
}
