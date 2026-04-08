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

CORE LAYERING RULES:
1. **Stronger First, Lighter On Top:** Always apply the stronger/heavier fragrance first, then layer the lighter one on top
2. **Base Notes Are King:** Layer fragrances based on their BASE notes, not top notes. Same base notes go together and will smell better for longer, well after the top and mid notes fade
3. **Volatility Timing:** Heavier scents need 30-60 seconds to settle before adding lighter layers
4. **Pulse Points:** Wrists, neck, behind ears, inner elbows - body heat diffuses fragrance
5. **Distance Zones:** Chest/clothes for projection, neck/ears for intimate sillage

EXPERT PAIRING KNOWLEDGE (use when relevant):
- Citrus + Woods always work: grapefruit+vetiver, bergamot+cedar, mandarin+sandalwood — apply the woody one first
- Coffee notes + Cream/Milk notes = cappuccino effect — apply coffee first, cream on top
- Cardamom + Tobacco = romantic, cozy date night — apply tobacco first (heavier), spice on top
- Greens (fir, pine) + Aromatics (lavender, rosemary) on oakmoss base = classic fougère — apply the oakmoss/green base first
- Florals + Oud = legendary Middle Eastern layering — always apply oud first, florals second
- Vanilla/Tonka + Amber/Benzoin = seamless oriental warmth — apply the amber/benzoin first
- Patchouli + Leather = rich textured depth — apply leather first, patchouli on top
- Musk + Fruits = fresh skin-like sweetness — apply musk first as a base layer

SPRAY GUIDANCE:
- Subtle: 2-3 sprays per fragrance (for close encounters)
- Moderate: 3-4 sprays per fragrance (everyday wear)
- Bold: 5-6 sprays per fragrance (making a statement)

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

STEP 1 - DETERMINE ORDER:
Put the stronger fragrance first, and the lighter one on top.
Look at the BASE notes primarily — fragrances with heavier base notes (woods, orientals, ambers, tobacco, leather, oud) go FIRST.
Lighter character (citrus, fresh, green, fruity, floral) goes SECOND, on top.

STEP 2 - CONSIDER BASE NOTE SYNERGY:
Layer based on base notes instead of top. If they share base notes or have compatible base families, emphasize those connection points in your application guide. Same base notes will smell better together for longer.

STEP 3 - CHECK FOR KNOWN PAIRINGS:
- If one has citrus and the other woods: apply woody one to wrists/neck first, citrus on chest/behind ears
- If one has florals and the other oud: oud goes on pulse points first, florals layered on top
- If coffee + cream/milk notes: coffee on warm points first, cream notes as the lighter layer
- If cardamom/spice + tobacco: tobacco on wrists/neck first, spice on top for a romantic blend
- If greens + aromatics (lavender, rosemary): oakmoss/green base first, aromatics on top
- If vanilla/tonka + amber/benzoin: amber first (slightly heavier), vanilla/tonka on top
- If patchouli + leather: leather on pulse points first, patchouli layered on top
- If musk + fruits: musk as base layer first, fruits on top

Create 4-6 application steps following these rules.

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
  "proTip": "Specific tip about layering these two perfumes based on their BASE notes and any known pairing wisdom"
}`;

    // Helper function to determine weight/heaviness of a perfume
    const getHeavinessScore = (perfume: Perfume): number => {
      let score = 0;
      const heavyFamilies = /wood|oud|agarwood|amber|oriental|tobacco|leather|patchouli|incense|myrrh|benzoin|labdanum|resin|vetiver/i;
      const lightFamilies = /citrus|bergamot|lemon|fresh|green|aquatic|marine|fruity|apple|pear/i;

      // Base notes contribute most to heaviness (the guide says: "layer based on base notes")
      for (const note of perfume.baseNotes) {
        if (heavyFamilies.test(note.name)) score += 3;
        else score += 1;
      }
      // Middle notes contribute moderately
      for (const note of perfume.middleNotes) {
        if (heavyFamilies.test(note.name)) score += 2;
        else score += 0.5;
      }
      // Light top notes reduce heaviness
      for (const note of perfume.topNotes) {
        if (lightFamilies.test(note.name)) score -= 0.5;
      }

      return score;
    };

    // Helper function to generate fallback guide using expert rules
    const generateFallbackGuide = (): LayeringGuide => {
      const p1Heaviness = getHeavinessScore(perfume1);
      const p2Heaviness = getHeavinessScore(perfume2);

      // "Put the stronger fragrance first, and the lighter one on top"
      const firstIsHeavier = p1Heaviness >= p2Heaviness;
      const heavier = firstIsHeavier ? "first" : "second";
      const lighter = firstIsHeavier ? "second" : "first";
      const heavierPerfume = firstIsHeavier ? perfume1 : perfume2;
      const lighterPerfume = firstIsHeavier ? perfume2 : perfume1;
      const sprayCount = intensity === "subtle" ? 2 : intensity === "bold" ? 5 : 3;

      // Generate a relevant pro tip based on the notes
      const allNotes1 = [...perfume1.topNotes, ...perfume1.middleNotes, ...perfume1.baseNotes].map(n => n.name.toLowerCase());
      const allNotes2 = [...perfume2.topNotes, ...perfume2.middleNotes, ...perfume2.baseNotes].map(n => n.name.toLowerCase());
      const allNotes = [...allNotes1, ...allNotes2];

      let proTip = `Apply ${heavierPerfume.name} first (heavier base), then ${lighterPerfume.name} on top. Focus on where their base notes overlap for the longest-lasting harmony.`;

      // Check for known pairings and give specific tips
      const hasCitrus = allNotes.some(n => /citrus|bergamot|lemon|grapefruit|mandarin|orange|lime/.test(n));
      const hasWoods = allNotes.some(n => /wood|cedar|sandalwood|vetiver|oud|agarwood/.test(n));
      const hasFloral = allNotes.some(n => /rose|jasmine|tuberose|iris|violet/.test(n));
      const hasOud = allNotes.some(n => /oud|agarwood/.test(n));
      const hasCoffee = allNotes.some(n => /coffee|espresso/.test(n));
      const hasCream = allNotes.some(n => /cream|milk|vanilla/.test(n));
      const hasTobacco = allNotes.some(n => /tobacco/.test(n));
      const hasCardamom = allNotes.some(n => /cardamom/.test(n));

      if (hasCitrus && hasWoods) {
        proTip = `Citrus and woods always work together! Apply the woody fragrance on pulse points first, then the citrus on top. Swap notes freely within families (bergamot↔mandarin, vetiver↔sandalwood) — they'll all harmonize.`;
      } else if (hasFloral && hasOud) {
        proTip = `Florals with oud is a legendary Middle Eastern layering tradition. Apply the oud fragrance first on wrists and neck, then layer the floral on top for an opulent blend.`;
      } else if (hasCoffee && hasCream) {
        proTip = `Coffee + cream creates the cappuccino effect! Apply the coffee scent first on warm points, then layer the creamy one on top. Pure indulgence.`;
      } else if (hasTobacco && hasCardamom) {
        proTip = `Cardamom and tobacco are the two best scent families for a romantic candlelit dinner. Apply the tobacco fragrance first, then the cardamom on top for cozy intimacy.`;
      }

      return {
        steps: [
          { order: 1, perfume: heavier as "first" | "second", location: "wrists", sprays: 1, waitTime: 30, tip: "Let the base notes settle and bloom before the next layer" },
          { order: 2, perfume: heavier as "first" | "second", location: "neck", sprays: 1, waitTime: 30, tip: "Body heat on the neck will diffuse the heavier notes beautifully" },
          { order: 3, perfume: lighter as "first" | "second", location: "chest", sprays: 1, waitTime: 20, tip: "The lighter fragrance creates a beautiful projection cloud" },
          { order: 4, perfume: lighter as "first" | "second", location: "behind_ears", sprays: 1, tip: "For intimate sillage — the lighter notes will be what people smell up close" },
          ...(intensity !== "subtle" ? [
            { order: 5, perfume: heavier as "first" | "second", location: "inner_elbows" as const, sprays: 1, tip: "Extra pulse point for the base layer to anchor everything" },
          ] : []),
        ],
        totalSprays: { first: sprayCount, second: sprayCount },
        estimatedDuration: intensity === "subtle" ? "2 minutes" : "2-3 minutes",
        intensityLevel: intensity,
        proTip,
      };
    };

    let guide: LayeringGuide;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || "";

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
        guide = generateFallbackGuide();
      }
    } catch (groqError) {
      console.error("Groq API error, using fallback:", groqError);
      guide = generateFallbackGuide();
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
