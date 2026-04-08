import { Perfume, MatchAnalysis } from "./types";

// Note family classifications based on fragrance wheel
const NOTE_FAMILIES: Record<string, string[]> = {
  citrus: [
    "bergamot", "lemon", "orange", "grapefruit", "lime", "mandarin", "yuzu",
    "citron", "tangerine", "pomelo", "blood orange", "citrus", "neroli"
  ],
  floral: [
    "rose", "jasmine", "lily", "violet", "iris", "peony", "magnolia", "tuberose",
    "gardenia", "ylang-ylang", "orange blossom", "honeysuckle", "freesia",
    "carnation", "geranium", "lotus", "orchid", "plumeria", "frangipani", "heliotrope"
  ],
  woody: [
    "sandalwood", "cedar", "oud", "agarwood", "vetiver", "patchouli", "birch",
    "cypress", "guaiac wood", "teak", "driftwood", "mahogany", "ebony",
    "pine", "fir", "juniper", "bamboo", "oak"
  ],
  oriental: [
    "vanilla", "amber", "benzoin", "labdanum", "incense", "myrrh", "frankincense",
    "opoponax", "copal", "balsam", "resin", "ambergris", "tonka", "tonka bean"
  ],
  spicy: [
    "cinnamon", "cardamom", "pepper", "clove", "nutmeg", "ginger", "saffron",
    "cumin", "coriander", "anise", "star anise", "pink pepper", "black pepper",
    "white pepper"
  ],
  fresh: [
    "mint", "eucalyptus", "tea", "green tea", "cucumber", "melon", "water",
    "marine", "aquatic", "ozonic", "aldehydes", "sea salt"
  ],
  green: [
    "grass", "leaf", "green", "galbanum", "fig leaf", "basil", "artemisia",
    "tomato leaf", "violet leaf", "ivy", "rosemary", "thyme", "sage"
  ],
  fruity: [
    "apple", "peach", "apricot", "plum", "cherry", "raspberry", "strawberry",
    "blackberry", "blackcurrant", "pear", "coconut", "mango", "pineapple",
    "banana", "passion fruit", "lychee", "fig", "date", "pomegranate"
  ],
  gourmand: [
    "chocolate", "coffee", "caramel", "honey", "praline", "almond", "hazelnut",
    "tonka", "cotton candy", "marshmallow", "cream", "milk", "butter",
    "brown sugar", "maple", "espresso", "cappuccino", "cocoa"
  ],
  musky: [
    "musk", "white musk", "skin", "cashmere", "suede", "leather"
  ],
  animalic: [
    "civet", "castoreum", "hyraceum", "costus", "animalic"
  ],
  earthy: [
    "moss", "oakmoss", "earth", "soil", "peat", "mushroom", "truffle",
    "vetiver", "orris root"
  ],
  tobacco: [
    "tobacco", "pipe tobacco", "tobacco leaf", "tobacco blossom"
  ],
  aromatic: [
    "lavender", "rosemary", "thyme", "sage", "basil", "mint", "eucalyptus",
    "tarragon", "marjoram", "oregano"
  ]
};

// Family compatibility matrix (0-100 score)
// Updated with expert layering knowledge:
// - Citrus + Woods always work (grapefruit/bergamot + vetiver/sandalwood/cedar)
// - Spices + Gourmand (natural pairing)
// - Florals + Oud/Woody (classic combination)
// - Musk + Fruits (complementary)
// - Vanilla/Tonka + Amber/Benzoin (oriental harmony)
// - Patchouli + Leather (rich pairing)
// - Greens + Aromatics + Oakmoss (fougère foundation)
// - Cardamom/Tobacco for romantic/cozy (spicy + tobacco)
const FAMILY_COMPATIBILITY: Record<string, Record<string, number>> = {
  citrus:   { citrus: 80, floral: 85, woody: 88, oriental: 60, spicy: 65, fresh: 95, green: 90, fruity: 80, gourmand: 50, musky: 75, animalic: 40, earthy: 55, tobacco: 45, aromatic: 85 },
  floral:   { citrus: 85, floral: 80, woody: 88, oriental: 85, spicy: 70, fresh: 70, green: 75, fruity: 85, gourmand: 70, musky: 90, animalic: 60, earthy: 65, tobacco: 55, aromatic: 78 },
  woody:    { citrus: 88, floral: 88, woody: 82, oriental: 95, spicy: 90, fresh: 65, green: 75, fruity: 55, gourmand: 75, musky: 88, animalic: 80, earthy: 92, tobacco: 90, aromatic: 85 },
  oriental: { citrus: 60, floral: 85, woody: 95, oriental: 88, spicy: 95, fresh: 45, green: 50, fruity: 65, gourmand: 92, musky: 90, animalic: 85, earthy: 80, tobacco: 92, aromatic: 72 },
  spicy:    { citrus: 65, floral: 70, woody: 90, oriental: 95, spicy: 80, fresh: 50, green: 55, fruity: 60, gourmand: 92, musky: 80, animalic: 75, earthy: 75, tobacco: 93, aromatic: 80 },
  fresh:    { citrus: 95, floral: 70, woody: 65, oriental: 45, spicy: 50, fresh: 85, green: 95, fruity: 85, gourmand: 40, musky: 70, animalic: 30, earthy: 55, tobacco: 35, aromatic: 88 },
  green:    { citrus: 90, floral: 75, woody: 75, oriental: 50, spicy: 55, fresh: 95, green: 80, fruity: 75, gourmand: 45, musky: 65, animalic: 35, earthy: 82, tobacco: 50, aromatic: 92 },
  fruity:   { citrus: 80, floral: 85, woody: 55, oriental: 65, spicy: 60, fresh: 85, green: 75, fruity: 80, gourmand: 92, musky: 88, animalic: 45, earthy: 50, tobacco: 48, aromatic: 60 },
  gourmand: { citrus: 50, floral: 70, woody: 75, oriental: 92, spicy: 92, fresh: 40, green: 45, fruity: 92, gourmand: 85, musky: 80, animalic: 70, earthy: 60, tobacco: 88, aromatic: 55 },
  musky:    { citrus: 75, floral: 90, woody: 88, oriental: 90, spicy: 80, fresh: 70, green: 65, fruity: 88, gourmand: 80, musky: 80, animalic: 85, earthy: 75, tobacco: 78, aromatic: 72 },
  animalic: { citrus: 40, floral: 60, woody: 80, oriental: 85, spicy: 75, fresh: 30, green: 35, fruity: 45, gourmand: 70, musky: 85, animalic: 75, earthy: 80, tobacco: 82, aromatic: 50 },
  earthy:   { citrus: 55, floral: 65, woody: 92, oriental: 80, spicy: 75, fresh: 55, green: 82, fruity: 50, gourmand: 60, musky: 75, animalic: 80, earthy: 80, tobacco: 78, aromatic: 85 },
  tobacco:  { citrus: 45, floral: 55, woody: 90, oriental: 92, spicy: 93, fresh: 35, green: 50, fruity: 48, gourmand: 88, musky: 78, animalic: 82, earthy: 78, tobacco: 80, aromatic: 70 },
  aromatic: { citrus: 85, floral: 78, woody: 85, oriental: 72, spicy: 80, fresh: 88, green: 92, fruity: 60, gourmand: 55, musky: 72, animalic: 50, earthy: 85, tobacco: 70, aromatic: 80 }
};

// Known note-level affinities from expert layering guide
// These are specific note pairs that work exceptionally well together
const KNOWN_NOTE_AFFINITIES: Array<{
  notes1: string[];  // notes from one side
  notes2: string[];  // notes from the other side
  bonus: number;     // 0-100 bonus score
  reason: string;
}> = [
  // Citrus + Woods always work (grapefruit+vetiver, bergamot+cedar, mandarin+sandalwood, etc.)
  {
    notes1: ["grapefruit", "bergamot", "mandarin", "orange", "lemon", "lime", "citrus", "neroli", "yuzu"],
    notes2: ["vetiver", "sandalwood", "cedar", "oud", "agarwood", "guaiac wood", "cypress", "teak"],
    bonus: 95,
    reason: "Citrus and woods are a timeless layering combination"
  },
  // Almond + Cherry (gourmand + fruity sweetness)
  {
    notes1: ["almond", "praline", "hazelnut", "marzipan"],
    notes2: ["cherry", "sour cherry", "maraschino cherry", "black cherry", "griotte"],
    bonus: 95,
    reason: "Almond and cherry create an irresistible gourmand-fruity harmony"
  },
  // Coffee + Boozy/Whiskey notes (café culture combos)
  {
    notes1: ["coffee", "espresso", "cappuccino", "mocha"],
    notes2: ["whiskey", "rum", "cognac", "bourbon", "brandy", "wine"],
    bonus: 90,
    reason: "Coffee and boozy notes create a rich, indulgent warmth"
  },
  // Coffee + Milk/Cream (cappuccino effect)
  {
    notes1: ["coffee", "espresso", "cappuccino", "mocha"],
    notes2: ["milk", "cream", "butter", "coconut milk", "vanilla"],
    bonus: 92,
    reason: "Coffee with cream/milk creates the perfect cappuccino blend"
  },
  // Cardamom + Tobacco (romantic candlelit dinner)
  {
    notes1: ["cardamom", "cinnamon", "nutmeg", "clove"],
    notes2: ["tobacco", "pipe tobacco", "tobacco leaf"],
    bonus: 93,
    reason: "Cardamom and tobacco create the ultimate romantic, cozy atmosphere"
  },
  // Greens + Aromatics + Oakmoss (fougère family)
  {
    notes1: ["fir", "pine", "juniper", "cypress", "grass", "galbanum"],
    notes2: ["lavender", "rosemary", "thyme", "sage", "basil"],
    bonus: 90,
    reason: "Green and aromatic notes on an oakmoss base create classic fougère magic"
  },
  // Patchouli + Leather
  {
    notes1: ["patchouli"],
    notes2: ["leather", "suede"],
    bonus: 92,
    reason: "Patchouli and leather create a rich, textured depth"
  },
  // Vanilla/Tonka + Amber/Benzoin (oriental self-synergy)
  {
    notes1: ["vanilla", "tonka", "tonka bean"],
    notes2: ["amber", "benzoin", "labdanum", "ambergris"],
    bonus: 93,
    reason: "Vanilla/tonka with amber/benzoin creates seamless oriental warmth"
  },
  // Florals + Oud
  {
    notes1: ["rose", "jasmine", "tuberose", "iris", "violet", "peony", "magnolia", "gardenia", "lily"],
    notes2: ["oud", "agarwood"],
    bonus: 92,
    reason: "Florals with oud is a legendary Middle Eastern layering tradition"
  },
  // Musk + Fruits
  {
    notes1: ["musk", "white musk", "skin", "cashmere"],
    notes2: ["apple", "peach", "pear", "plum", "cherry", "raspberry", "strawberry", "blackberry", "mango", "pineapple", "fig"],
    bonus: 88,
    reason: "Musk with fruits creates a fresh, skin-like sweetness"
  },
  // Pineapple/Birch (Aventus DNA) + Pepper/Ambroxan (Sauvage DNA)
  {
    notes1: ["pineapple", "birch", "blackcurrant", "apple"],
    notes2: ["pepper", "ambroxan", "elemi", "geranium", "bergamot"],
    bonus: 85,
    reason: "Aventus-style fruity-smoky layers surprisingly well with Sauvage-style fresh-spicy"
  },
  // Oakmoss anchoring green/aromatic notes
  {
    notes1: ["oakmoss", "moss", "tree moss"],
    notes2: ["lavender", "rosemary", "fir", "pine", "juniper", "galbanum"],
    bonus: 88,
    reason: "Oakmoss anchors green and aromatic notes for a distinguished fougère base"
  }
];

// Family-level pairing rules (broader patterns from the expert guide)
const FAMILY_PAIRING_RULES: Array<{
  family1: string;
  family2: string;
  bonus: number;
}> = [
  { family1: "spicy", family2: "gourmand", bonus: 15 },
  { family1: "floral", family2: "woody", bonus: 12 },  // florals + oud/woods
  { family1: "musky", family2: "fruity", bonus: 12 },
  { family1: "oriental", family2: "oriental", bonus: 10 },  // vanilla/tonka + amber/benzoin
  { family1: "green", family2: "aromatic", bonus: 15 },  // fougère
  { family1: "green", family2: "earthy", bonus: 12 },    // fougère with oakmoss
  { family1: "aromatic", family2: "earthy", bonus: 12 }, // fougère with oakmoss
  { family1: "spicy", family2: "tobacco", bonus: 15 },   // cardamom + tobacco
  { family1: "citrus", family2: "woody", bonus: 12 },    // citrus + woods
  { family1: "gourmand", family2: "gourmand", bonus: 10 }, // coffee + cream, etc.
];

function normalizeNoteName(note: string): string {
  return note.toLowerCase().trim();
}

function getNoteFamily(noteName: string): string | null {
  const normalized = normalizeNoteName(noteName);

  for (const [family, notes] of Object.entries(NOTE_FAMILIES)) {
    if (notes.some(n => normalized.includes(n) || n.includes(normalized))) {
      return family;
    }
  }

  return null;
}

function getAllNotes(perfume: Perfume): string[] {
  return [
    ...perfume.topNotes.map(n => n.name),
    ...perfume.middleNotes.map(n => n.name),
    ...perfume.baseNotes.map(n => n.name)
  ];
}

function getBaseNotes(perfume: Perfume): string[] {
  return perfume.baseNotes.map(n => n.name);
}

function getPerfumeFamilies(perfume: Perfume): Map<string, number> {
  const families = new Map<string, number>();
  const allNotes = getAllNotes(perfume);

  for (const note of allNotes) {
    const family = getNoteFamily(note);
    if (family) {
      families.set(family, (families.get(family) || 0) + 1);
    }
  }

  return families;
}

function calculateNoteOverlap(perfume1: Perfume, perfume2: Perfume): { score: number; shared: string[] } {
  const notes1 = new Set(getAllNotes(perfume1).map(normalizeNoteName));
  const notes2 = new Set(getAllNotes(perfume2).map(normalizeNoteName));

  const shared: string[] = [];
  for (const note of notes1) {
    if (notes2.has(note)) {
      shared.push(note);
    }
  }

  const totalUnique = new Set([...notes1, ...notes2]).size;
  const overlapRatio = shared.length / totalUnique;

  // Optimal overlap is around 20-40%
  let score: number;
  if (overlapRatio < 0.1) {
    score = overlapRatio * 500;
  } else if (overlapRatio <= 0.4) {
    score = 50 + (overlapRatio - 0.1) * 166.7;
  } else {
    score = 100 - (overlapRatio - 0.4) * 83.3;
  }

  return { score: Math.min(100, Math.max(0, score)), shared };
}

function calculateFamilyHarmony(perfume1: Perfume, perfume2: Perfume): number {
  const families1 = getPerfumeFamilies(perfume1);
  const families2 = getPerfumeFamilies(perfume2);

  if (families1.size === 0 || families2.size === 0) {
    return 50;
  }

  let totalScore = 0;
  let comparisons = 0;

  for (const [fam1, count1] of families1) {
    for (const [fam2, count2] of families2) {
      const compatibility = fam1 === fam2
        ? 85
        : (FAMILY_COMPATIBILITY[fam1]?.[fam2] || 50);

      // Apply family pairing rule bonuses
      let bonus = 0;
      for (const rule of FAMILY_PAIRING_RULES) {
        if ((fam1 === rule.family1 && fam2 === rule.family2) ||
            (fam1 === rule.family2 && fam2 === rule.family1)) {
          bonus = Math.max(bonus, rule.bonus);
        }
      }

      const weight = count1 * count2;
      totalScore += Math.min(100, compatibility + bonus) * weight;
      comparisons += weight;
    }
  }

  return comparisons > 0 ? totalScore / comparisons : 50;
}

function calculateLayerBalance(perfume1: Perfume, perfume2: Perfume): number {
  const combinedTop = perfume1.topNotes.length + perfume2.topNotes.length;
  const combinedMiddle = perfume1.middleNotes.length + perfume2.middleNotes.length;
  const combinedBase = perfume1.baseNotes.length + perfume2.baseNotes.length;

  const total = combinedTop + combinedMiddle + combinedBase;
  if (total === 0) return 50;

  // Ideal ratio is roughly 30% top, 40% middle, 30% base
  const topRatio = combinedTop / total;
  const middleRatio = combinedMiddle / total;
  const baseRatio = combinedBase / total;

  const topDeviation = Math.abs(topRatio - 0.30);
  const middleDeviation = Math.abs(middleRatio - 0.40);
  const baseDeviation = Math.abs(baseRatio - 0.30);

  const avgDeviation = (topDeviation + middleDeviation + baseDeviation) / 3;

  return Math.max(0, 100 - (avgDeviation * 333));
}

function calculateAccordBlend(perfume1: Perfume, perfume2: Perfume): number {
  if (!perfume1.accords?.length || !perfume2.accords?.length) {
    return 70;
  }

  const topAccords1 = perfume1.accords.slice(0, 3).map(a => a.toLowerCase());
  const topAccords2 = perfume2.accords.slice(0, 3).map(a => a.toLowerCase());

  let compatibilitySum = 0;
  let count = 0;

  for (const accord1 of topAccords1) {
    const family1 = getNoteFamily(accord1);
    for (const accord2 of topAccords2) {
      const family2 = getNoteFamily(accord2);

      if (family1 && family2) {
        compatibilitySum += FAMILY_COMPATIBILITY[family1]?.[family2] || 60;
        count++;
      }
    }
  }

  return count > 0 ? compatibilitySum / count : 70;
}

// NEW: Base Note Synergy - "Layer fragrances based on bottom notes instead of top.
// Same bottoms go together, and will smell better for longer."
function calculateBaseNoteSynergy(perfume1: Perfume, perfume2: Perfume): number {
  const base1 = getBaseNotes(perfume1).map(normalizeNoteName);
  const base2 = getBaseNotes(perfume2).map(normalizeNoteName);

  if (base1.length === 0 || base2.length === 0) return 50;

  // Check for shared base notes (strongest signal)
  const sharedBases = base1.filter(n => base2.includes(n));
  const sharedBaseRatio = sharedBases.length / Math.max(base1.length, base2.length);

  // Check for base note family compatibility
  const baseFamilies1 = new Map<string, number>();
  const baseFamilies2 = new Map<string, number>();

  for (const note of base1) {
    const family = getNoteFamily(note);
    if (family) baseFamilies1.set(family, (baseFamilies1.get(family) || 0) + 1);
  }
  for (const note of base2) {
    const family = getNoteFamily(note);
    if (family) baseFamilies2.set(family, (baseFamilies2.get(family) || 0) + 1);
  }

  // Calculate base family compatibility
  let familyScore = 0;
  let familyComparisons = 0;

  for (const [fam1, count1] of baseFamilies1) {
    for (const [fam2, count2] of baseFamilies2) {
      const compat = fam1 === fam2
        ? 95  // Same base family is excellent
        : (FAMILY_COMPATIBILITY[fam1]?.[fam2] || 50);

      const weight = count1 * count2;
      familyScore += compat * weight;
      familyComparisons += weight;
    }
  }

  const baseFamilyCompat = familyComparisons > 0 ? familyScore / familyComparisons : 50;

  // Shared base notes are weighted heavily (40%) + base family compat (60%)
  const sharedBonus = sharedBaseRatio * 100;
  return Math.min(100, sharedBonus * 0.4 + baseFamilyCompat * 0.6);
}

// NEW: Known Pairing Bonus - checks if the two perfumes match any known
// expert-validated layering combinations
function calculateKnownPairingBonus(perfume1: Perfume, perfume2: Perfume): number {
  const allNotes1 = getAllNotes(perfume1).map(normalizeNoteName);
  const allNotes2 = getAllNotes(perfume2).map(normalizeNoteName);

  let bestBonus = 0;
  let matchCount = 0;

  for (const affinity of KNOWN_NOTE_AFFINITIES) {
    // Check both directions: p1 has notes1 & p2 has notes2, or vice versa
    const p1HasNotes1 = affinity.notes1.some(n => allNotes1.some(pn => pn.includes(n) || n.includes(pn)));
    const p2HasNotes2 = affinity.notes2.some(n => allNotes2.some(pn => pn.includes(n) || n.includes(pn)));
    const p1HasNotes2 = affinity.notes2.some(n => allNotes1.some(pn => pn.includes(n) || n.includes(pn)));
    const p2HasNotes1 = affinity.notes1.some(n => allNotes2.some(pn => pn.includes(n) || n.includes(pn)));

    if ((p1HasNotes1 && p2HasNotes2) || (p1HasNotes2 && p2HasNotes1)) {
      bestBonus = Math.max(bestBonus, affinity.bonus);
      matchCount++;
    }
  }

  if (matchCount === 0) {
    // No known pairing match — return a neutral score so it doesn't penalize
    return 50;
  }

  // Multiple matching affinities boost the score further
  const multiMatchBonus = Math.min(10, (matchCount - 1) * 3);
  return Math.min(100, bestBonus + multiMatchBonus);
}

function findComplementaryNotes(perfume1: Perfume, perfume2: Perfume): string[] {
  const notes1 = getAllNotes(perfume1);
  const notes2 = getAllNotes(perfume2);
  const complementary: string[] = [];

  const families1 = new Set(notes1.map(getNoteFamily).filter(Boolean));

  for (const note of notes2) {
    const family = getNoteFamily(note);
    if (!family) continue;

    if (!notes1.map(normalizeNoteName).includes(normalizeNoteName(note))) {
      let compatible = false;
      for (const fam1 of families1) {
        if ((FAMILY_COMPATIBILITY[fam1 as string]?.[family] || 0) >= 75) {
          compatible = true;
          break;
        }
      }
      if (compatible) {
        complementary.push(note);
      }
    }
  }

  return complementary.slice(0, 5);
}

function findPotentialClashes(perfume1: Perfume, perfume2: Perfume): string[] {
  const notes1 = getAllNotes(perfume1);
  const notes2 = getAllNotes(perfume2);
  const clashes: string[] = [];

  for (const note1 of notes1) {
    const family1 = getNoteFamily(note1);
    if (!family1) continue;

    for (const note2 of notes2) {
      const family2 = getNoteFamily(note2);
      if (!family2) continue;

      const compatibility = FAMILY_COMPATIBILITY[family1]?.[family2] || 50;
      if (compatibility < 50) {
        clashes.push(`${note1} + ${note2}`);
      }
    }
  }

  return clashes.slice(0, 3);
}

export function calculateMatch(perfume1: Perfume, perfume2: Perfume): MatchAnalysis {
  const noteOverlapResult = calculateNoteOverlap(perfume1, perfume2);
  const familyHarmony = calculateFamilyHarmony(perfume1, perfume2);
  const layerBalance = calculateLayerBalance(perfume1, perfume2);
  const accordBlend = calculateAccordBlend(perfume1, perfume2);
  const baseNoteSynergy = calculateBaseNoteSynergy(perfume1, perfume2);
  const knownPairingBonus = calculateKnownPairingBonus(perfume1, perfume2);

  // Weighted average for final score
  // Base note synergy is heavily weighted because "same bottoms go together"
  // Known pairing bonus rewards expert-validated combinations
  const weights = {
    noteOverlap: 0.10,
    familyHarmony: 0.25,
    layerBalance: 0.10,
    accordBlend: 0.15,
    baseNoteSynergy: 0.25,
    knownPairingBonus: 0.15
  };

  const score = Math.round(
    noteOverlapResult.score * weights.noteOverlap +
    familyHarmony * weights.familyHarmony +
    layerBalance * weights.layerBalance +
    accordBlend * weights.accordBlend +
    baseNoteSynergy * weights.baseNoteSynergy +
    knownPairingBonus * weights.knownPairingBonus
  );

  return {
    score,
    breakdown: {
      noteOverlap: Math.round(noteOverlapResult.score),
      familyHarmony: Math.round(familyHarmony),
      layerBalance: Math.round(layerBalance),
      accordBlend: Math.round(accordBlend),
      baseNoteSynergy: Math.round(baseNoteSynergy),
      knownPairingBonus: Math.round(knownPairingBonus)
    },
    sharedNotes: noteOverlapResult.shared,
    complementaryNotes: findComplementaryNotes(perfume1, perfume2),
    potentialClashes: findPotentialClashes(perfume1, perfume2)
  };
}

export { NOTE_FAMILIES, FAMILY_COMPATIBILITY, KNOWN_NOTE_AFFINITIES, FAMILY_PAIRING_RULES, getNoteFamily };
