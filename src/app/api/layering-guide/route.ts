import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, LayeringGuide } from "@/lib/types";

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
      // Return a default guide if no API key
      const fallbackGuide: LayeringGuide = {
        steps: [
          { order: 1, perfume: "first", location: "wrists", sprays: 1, waitTime: 30, tip: "Let it settle" },
          { order: 2, perfume: "first", location: "neck", sprays: 1, waitTime: 30 },
          { order: 3, perfume: "second", location: "chest", sprays: 1, waitTime: 0, tip: "Creates a scent cloud" },
          { order: 4, perfume: "second", location: "behind_ears", sprays: 1, waitTime: 0 },
        ],
        totalSprays: { first: 2, second: 2 },
        estimatedDuration: "2 minutes",
        intensityLevel: "moderate",
        proTip: "Apply to pulse points for best projection and longevity.",
      };
      return NextResponse.json({ guide: fallbackGuide });
    }

    const sprayCountByIntensity = {
      subtle: "2-3 total sprays per fragrance",
      moderate: "3-4 total sprays per fragrance",
      bold: "5-6 total sprays per fragrance",
    };

    const prompt = `You are a professional perfumer creating a step-by-step layering guide for two fragrances.

FIRST PERFUME:
${formatPerfumeForPrompt(perfume1)}

SECOND PERFUME:
${formatPerfumeForPrompt(perfume2)}

DESIRED INTENSITY: ${intensity} (${sprayCountByIntensity[intensity]})

Create a precise layering guide. Consider which perfume is heavier/lighter based on notes.
Generally: apply heavier/base-heavy scents first, lighter/fresher ones second.

Respond with ONLY this JSON structure:
{
  "steps": [
    {
      "order": 1,
      "perfume": "first",
      "location": "wrists",
      "sprays": 1,
      "waitTime": 30,
      "tip": "Let the base notes settle"
    }
  ],
  "totalSprays": { "first": 3, "second": 3 },
  "estimatedDuration": "2-3 minutes",
  "intensityLevel": "${intensity}",
  "proTip": "Your specific tip about these two fragrances"
}

RULES:
- location must be one of: "wrists", "neck", "chest", "behind_ears", "inner_elbows", "hair", "clothes"
- perfume must be "first" (${perfume1.name}) or "second" (${perfume2.name})
- waitTime is in seconds (0-60), use when switching perfumes or for settling
- Keep to 4-8 steps total
- Include at least one tip in the steps
- Be specific about why in the proTip`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a fragrance expert. Respond with valid JSON only, no markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    let guide: LayeringGuide;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guide = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback guide
      guide = {
        steps: [
          { order: 1, perfume: "first", location: "wrists", sprays: 1, waitTime: 30, tip: "Let the base notes settle" },
          { order: 2, perfume: "first", location: "neck", sprays: 1, waitTime: 20 },
          { order: 3, perfume: "second", location: "chest", sprays: 1, waitTime: 0, tip: "Creates a beautiful scent cloud" },
          { order: 4, perfume: "second", location: "behind_ears", sprays: 1 },
        ],
        totalSprays: { first: 2, second: 2 },
        estimatedDuration: "2 minutes",
        intensityLevel: intensity,
        proTip: "Apply to pulse points where body heat helps diffuse the fragrance.",
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
