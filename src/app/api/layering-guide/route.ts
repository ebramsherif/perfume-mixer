import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, LayeringGuide } from "@/lib/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function formatPerfumeForPrompt(perfume: Perfume): string {
  const topNotes = perfume.topNotes.map((n) => n.name).join(", ") || "unknown";
  const middleNotes = perfume.middleNotes.map((n) => n.name).join(", ") || "unknown";
  const baseNotes = perfume.baseNotes.map((n) => n.name).join(", ") || "unknown";

  return `**${perfume.name}** by ${perfume.brand}
- Top (5-15 min): ${topNotes}
- Heart (2-4 hrs): ${middleNotes}
- Base (4-24+ hrs): ${baseNotes}`;
}

const SYSTEM_PROMPT = `You are "The Nose," an expert perfumer creating precise layering application guides.

KEY PRINCIPLES:
1. **Heavy-First Rule:** Apply heaviest molecules (Woods/Orientals/Ambers) FIRST, lightest (Citrus/Florals) SECOND
2. **Volatility Timing:** Heavier scents need time to settle before adding lighter layers
3. **Pulse Points:** Wrists, neck, behind ears, inner elbows - body heat diffuses fragrance
4. **Distance Zones:** Chest/clothes for projection, neck/ears for intimate sillage

SPRAY GUIDANCE:
- Subtle: 2-3 sprays per fragrance
- Moderate: 3-4 sprays per fragrance
- Bold: 5-6 sprays per fragrance

Respond ONLY with valid JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { perfume1, perfume2, intensity = "moderate" }: {
      perfume1: Perfume;
      perfume2: Perfume;
      intensity?: "subtle" | "moderate" | "bold";
    } = body;

    if (!perfume1 || !perfume2) {
      return NextResponse.json(
        { error: "Both perfumes are required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      const fallbackGuide: LayeringGuide = {
        steps: [
          { order: 1, perfume: "first", location: "wrists", sprays: 1, waitTime: 30, tip: "Let base notes settle" },
          { order: 2, perfume: "first", location: "neck", sprays: 1, waitTime: 20 },
          { order: 3, perfume: "second", location: "chest", sprays: 1, tip: "Creates projection cloud" },
          { order: 4, perfume: "second", location: "behind_ears", sprays: 1 },
        ],
        totalSprays: { first: 2, second: 2 },
        estimatedDuration: "2 minutes",
        intensityLevel: "moderate",
        proTip: "Apply heavier fragrance first, let it settle, then add the lighter one.",
      };
      return NextResponse.json({ guide: fallbackGuide });
    }

    // Determine which is heavier based on note profiles
    const prompt = `Create a precise layering application guide for these two perfumes.

PERFUME 1 (call it "first"):
${formatPerfumeForPrompt(perfume1)}

PERFUME 2 (call it "second"):
${formatPerfumeForPrompt(perfume2)}

INTENSITY: ${intensity}

ANALYZE: Which perfume is heavier (more base-heavy, oriental, woody)? That one goes FIRST.
Which is lighter (more citrus, fresh, floral)? That one goes SECOND.

Create 4-6 application steps following the Heavy-First Rule.

Respond with ONLY this JSON:
{
  "heavierPerfume": "first" or "second",
  "reasoning": "Brief explanation of why (which notes make it heavier)",
  "steps": [
    {
      "order": 1,
      "perfume": "first" or "second",
      "location": "wrists|neck|chest|behind_ears|inner_elbows|hair|clothes",
      "sprays": 1,
      "waitTime": 30,
      "tip": "Optional tip about this step"
    }
  ],
  "totalSprays": { "first": 3, "second": 3 },
  "estimatedDuration": "2-3 minutes",
  "intensityLevel": "${intensity}",
  "proTip": "Specific tip about layering these two perfumes based on their notes"
}`;

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

    let guide: LayeringGuide;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        guide = {
          steps: parsed.steps || [],
          totalSprays: parsed.totalSprays || { first: 2, second: 2 },
          estimatedDuration: parsed.estimatedDuration || "2-3 minutes",
          intensityLevel: parsed.intensityLevel || intensity,
          proTip: parsed.proTip || "Apply heavier fragrance first for best results.",
        };
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Intelligent fallback based on note analysis
      const p1BaseHeavy = perfume1.baseNotes.length;
      const p2BaseHeavy = perfume2.baseNotes.length;
      const p1TopFresh = perfume1.topNotes.some(n =>
        /citrus|bergamot|lemon|fresh|green/.test(n.name.toLowerCase())
      );
      const p2TopFresh = perfume2.topNotes.some(n =>
        /citrus|bergamot|lemon|fresh|green/.test(n.name.toLowerCase())
      );

      // Determine order: more base notes or less fresh = heavier = first
      const firstIsHeavier = p1BaseHeavy > p2BaseHeavy || (p2TopFresh && !p1TopFresh);
      const heavier = firstIsHeavier ? "first" : "second";
      const lighter = firstIsHeavier ? "second" : "first";

      const sprayCount = intensity === "subtle" ? 2 : intensity === "bold" ? 4 : 3;

      guide = {
        steps: [
          { order: 1, perfume: heavier as "first" | "second", location: "wrists", sprays: 1, waitTime: 30, tip: "Let the base notes bloom" },
          { order: 2, perfume: heavier as "first" | "second", location: "neck", sprays: 1, waitTime: 20 },
          { order: 3, perfume: lighter as "first" | "second", location: "chest", sprays: 1, tip: "Creates a beautiful projection cloud" },
          { order: 4, perfume: lighter as "first" | "second", location: "behind_ears", sprays: 1, tip: "For intimate sillage" },
        ],
        totalSprays: { first: sprayCount, second: sprayCount },
        estimatedDuration: "2-3 minutes",
        intensityLevel: intensity,
        proTip: `Apply ${firstIsHeavier ? perfume1.name : perfume2.name} first (heavier base), then ${firstIsHeavier ? perfume2.name : perfume1.name} (lighter/fresher).`,
      };
    }

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Layering guide API error:", error);
    return NextResponse.json(
      { error: "Failed to generate layering guide" },
      { status: 500 }
    );
  }
}
