import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, AIPairing, SearchResult } from "@/lib/types";
import { searchFragrances } from "@/lib/fragranceApi";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function formatPerfumeForPrompt(perfume: Perfume): string {
  const topNotes = perfume.topNotes.map((n) => n.name).join(", ") || "none listed";
  const middleNotes = perfume.middleNotes.map((n) => n.name).join(", ") || "none listed";
  const baseNotes = perfume.baseNotes.map((n) => n.name).join(", ") || "none listed";

  return `${perfume.name} by ${perfume.brand}
  - Top notes: ${topNotes}
  - Heart notes: ${middleNotes}
  - Base notes: ${baseNotes}`;
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
      return NextResponse.json({ pairings: [], resolved: [] });
    }

    const prompt = `You are a fragrance expert who knows which perfumes layer beautifully together.

Given this perfume:
${formatPerfumeForPrompt(perfume)}

Suggest 5 REAL, EXISTING perfumes that would create an amazing layered combination with it.
Consider:
- Note harmony (complementary scent families)
- Balance (if one is heavy, suggest lighter complements)
- Known successful layering combinations in the fragrance community
- Classic pairings that work well together

IMPORTANT: Only suggest REAL perfumes that exist. Use exact names.

Respond with ONLY this JSON:
{
  "pairings": [
    {
      "name": "Exact Perfume Name",
      "brand": "Brand Name",
      "reason": "Brief reason why this pairing works (15 words max)"
    }
  ]
}

Examples of real perfumes: "Bleu de Chanel", "Dior Sauvage", "Tom Ford Tobacco Vanille", "Versace Eros", "Acqua di Gio", etc.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a fragrance expert. Respond with valid JSON only. Only suggest real, existing perfumes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    let pairings: AIPairing[] = [];
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        pairings = parsed.pairings || [];
      }
    } catch {
      pairings = [];
    }

    // Now resolve these suggestions against our actual fragrance database
    const resolved: Array<SearchResult & { reason: string }> = [];

    for (const pairing of pairings.slice(0, 5)) {
      try {
        // Search for this perfume
        const searchQuery = `${pairing.name} ${pairing.brand}`;
        const results = await searchFragrances(searchQuery);

        if (results.length > 0) {
          // Find the best match
          const match = results.find(r =>
            r.name.toLowerCase().includes(pairing.name.toLowerCase().split(' ')[0]) ||
            pairing.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
          ) || results[0];

          // Don't add if it's the same perfume we're pairing with
          if (match.id !== perfume.id && !resolved.some(r => r.id === match.id)) {
            resolved.push({
              ...match,
              reason: pairing.reason,
            });
          }
        }
      } catch (e) {
        console.error("Error searching for pairing:", e);
      }
    }

    return NextResponse.json({
      pairings,
      resolved: resolved.slice(0, 5)
    });
  } catch (error) {
    console.error("AI pairings API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI pairings" },
      { status: 500 }
    );
  }
}
