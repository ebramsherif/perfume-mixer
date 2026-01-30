import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume, MatchAnalysis, AIAnalysisResult } from "@/lib/types";

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
    const {
      perfume1,
      perfume2,
      matchAnalysis,
    }: {
      perfume1: Perfume;
      perfume2: Perfume;
      matchAnalysis: MatchAnalysis;
    } = body;

    if (!perfume1 || !perfume2) {
      return NextResponse.json(
        { error: "Both perfumes are required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      // Return a fallback response if no API key
      const fallbackAnalysis: AIAnalysisResult = {
        summary: `Based on note analysis, ${perfume1.name} and ${perfume2.name} show ${matchAnalysis.score >= 70 ? "good" : matchAnalysis.score >= 50 ? "moderate" : "limited"} compatibility for layering.`,
        strengths: matchAnalysis.sharedNotes.length > 0
          ? [`Shared notes (${matchAnalysis.sharedNotes.join(", ")}) create cohesion`]
          : ["Both perfumes have distinct character that could create complexity"],
        considerations: matchAnalysis.potentialClashes.length > 0
          ? [`Watch for intensity balance between ${matchAnalysis.potentialClashes[0]}`]
          : ["Apply lightly and let each fragrance bloom naturally"],
        occasions: ["Evening events", "Special occasions"],
        layeringTip: "Apply the heavier fragrance first, then layer the lighter one on top.",
      };
      return NextResponse.json({ analysis: fallbackAnalysis });
    }

    const prompt = `You are a professional perfumer and fragrance expert. Analyze the following two perfumes for layering/mixing compatibility.

PERFUME 1:
${formatPerfumeForPrompt(perfume1)}

PERFUME 2:
${formatPerfumeForPrompt(perfume2)}

ALGORITHMIC ANALYSIS:
- Overall compatibility score: ${matchAnalysis.score}%
- Shared notes: ${matchAnalysis.sharedNotes.join(", ") || "none"}
- Complementary notes: ${matchAnalysis.complementaryNotes.join(", ") || "none identified"}
- Potential clashes: ${matchAnalysis.potentialClashes.join(", ") || "none identified"}

Based on this information, provide a JSON response with exactly this structure:
{
  "summary": "2-3 sentence overview of how these fragrances work together when layered",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "considerations": ["thing to watch out for 1", "thing to watch out for 2"],
  "occasions": ["best occasion 1", "best occasion 2", "best occasion 3"],
  "layeringTip": "specific advice on how to apply these two fragrances together for best results"
}

Be specific about note interactions. Focus on practical advice.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a fragrance expert. Always respond with valid JSON only, no markdown formatting.",
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

    // Parse JSON from response
    let analysis: AIAnalysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // Fallback if parsing fails
      analysis = {
        summary: responseText.slice(0, 200),
        strengths: ["Creates a unique scent combination"],
        considerations: ["Test on skin before wearing out"],
        occasions: ["Casual outings", "Personal enjoyment"],
        layeringTip: "Apply sparingly and adjust based on your preference.",
      };
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze perfume combination" },
      { status: 500 }
    );
  }
}
