import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Perfume } from "@/lib/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function formatPerfumeForContext(perfume: Perfume): string {
  const topNotes = perfume.topNotes.map((n) => n.name).join(", ") || "unknown";
  const middleNotes = perfume.middleNotes.map((n) => n.name).join(", ") || "unknown";
  const baseNotes = perfume.baseNotes.map((n) => n.name).join(", ") || "unknown";
  const accords = perfume.accords?.join(", ") || "unknown";

  return `**${perfume.name}** by ${perfume.brand}
- Accords: ${accords}
- Top Notes: ${topNotes}
- Heart Notes: ${middleNotes}
- Base Notes: ${baseNotes}
${perfume.perfumer ? `- Perfumer: ${perfume.perfumer}` : ""}
${perfume.year ? `- Year: ${perfume.year}` : ""}
${perfume.rating ? `- Rating: ${perfume.rating}/5` : ""}`;
}

const SYSTEM_PROMPT = `You are "The Nose," an expert perfumer and fragrance consultant with deep knowledge of olfactory science, perfumery history, and scent composition.

Your expertise includes:
- Note pyramids and volatility (top, heart, base notes)
- Olfactory families (Floral, Oriental, Woody, Fresh, Chypre, Fougere, Gourmand)
- Ingredient chemistry and interactions
- Layering techniques and compatibility
- Seasonal/occasion recommendations
- Fragrance history and famous perfumers

EXPERT LAYERING KNOWLEDGE (always apply when discussing layering or mixing):
- GOLDEN RULE: Layer fragrances based on BASE notes, not top notes. Same base notes go together and will smell better for longer
- Put the stronger fragrance first, lighter one on top
- Citrus and woods ALWAYS work together (grapefruit+vetiver, bergamot+cedar, mandarin+sandalwood — swap freely within families)
- Almond + Cherry = irresistible gourmand-fruity (inspired by L'Homme Ideal line)
- Coffee + Cream/Milk = the cappuccino blend everyone seeks (add Bianco Latte or similar to espresso frags)
- Coffee + Boozy notes (Angel's Share style + French Coffee = what Lattafa Qahwa should have been)
- Aventus-type (fruity/smoky) layers surprisingly well with Sauvage-type (fresh/spicy)
- Cardamom + Tobacco = the two best scent families for a romantic candlelit dinner (The One + La Nuit de l'Homme)
- Greens (fir, pine) + Aromatics (lavender, rosemary) + Oakmoss = classic distinguished fougère
- Spices with Gourmand = natural pairing
- Florals with Oud = legendary combination
- Musk with Fruits = fresh skin-like sweetness
- Vanilla/Tonka with Amber/Benzoin = seamless oriental warmth
- Patchouli with Leather = rich textured depth

When answering:
- Be conversational but informative
- Use your expertise to give specific, actionable advice
- Reference specific notes and accords when relevant
- When discussing layering, always consider base note compatibility first
- Keep responses concise (2-4 sentences for simple questions, more for complex ones)
- If asked about perfumes you have context for, use that specific information`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      perfume1,
      perfume2,
      conversationHistory = []
    }: {
      question: string;
      perfume1?: Perfume;
      perfume2?: Perfume;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        answer: "AI features require a GROQ API key. Please configure one to enable this feature.",
      });
    }

    // Build context about the perfumes
    let context = "";
    if (perfume1 && perfume2) {
      context = `The user is currently comparing two perfumes for layering:

PERFUME 1:
${formatPerfumeForContext(perfume1)}

PERFUME 2:
${formatPerfumeForContext(perfume2)}

Answer their question with these specific perfumes in mind.`;
    } else if (perfume1) {
      context = `The user is currently viewing this perfume:

${formatPerfumeForContext(perfume1)}

Answer their question with this specific perfume in mind.`;
    }

    // Build message history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (context) {
      messages.push({ role: "system", content: context });
    }

    // Add conversation history (limit to last 6 exchanges to manage context)
    const recentHistory = conversationHistory.slice(-12);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current question
    messages.push({ role: "user", content: question });

    try {
      const completion = await groq.chat.completions.create({
        messages,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 800,
      });

      const answer = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      return NextResponse.json({ answer });
    } catch (groqError) {
      // Check if it's a rate limit error
      const errorMessage = groqError instanceof Error ? groqError.message : String(groqError);
      if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        return NextResponse.json({
          answer: "I'm currently experiencing high demand. Please try again in a few minutes. In the meantime, you can explore the note profiles and compatibility scores shown above!",
        });
      }
      throw groqError;
    }
  } catch (error) {
    console.error("Ask AI API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}
