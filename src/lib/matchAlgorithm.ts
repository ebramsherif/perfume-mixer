import { Perfume, MatchAnalysis, PerfumeNote } from "./types";

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
    "opoponax", "copal", "balsam", "resin", "ambergris"
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
    "tomato leaf", "violet leaf", "ivy"
  ],
  fruity: [
    "apple", "peach", "apricot", "plum", "cherry", "raspberry", "strawberry",
    "blackberry", "blackcurrant", "pear", "coconut", "mango", "pineapple",
    "banana", "passion fruit", "lychee", "fig", "date", "pomegranate"
  ],
  gourmand: [
    "chocolate", "coffee", "caramel", "honey", "praline", "almond", "hazelnut",
    "tonka", "cotton candy", "marshmallow", "cream", "milk", "butter",
    "brown sugar", "maple"
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
  ]
};

// Family compatibility matrix (0-100 score)
const FAMILY_COMPATIBILITY: Record<string, Record<string, number>> = {
  citrus: { floral: 85, woody: 70, oriental: 60, spicy: 65, fresh: 95, green: 90, fruity: 80, gourmand: 50, musky: 75, animalic: 40, earthy: 55 },
  floral: { citrus: 85, woody: 80, oriental: 85, spicy: 70, fresh: 70, green: 75, fruity: 85, gourmand: 70, musky: 90, animalic: 60, earthy: 65 },
  woody: { citrus: 70, floral: 80, oriental: 95, spicy: 90, fresh: 65, green: 70, fruity: 55, gourmand: 75, musky: 85, animalic: 80, earthy: 90 },
  oriental: { citrus: 60, floral: 85, woody: 95, spicy: 95, fresh: 45, green: 50, fruity: 65, gourmand: 90, musky: 90, animalic: 85, earthy: 80 },
  spicy: { citrus: 65, floral: 70, woody: 90, oriental: 95, fresh: 50, green: 55, fruity: 60, gourmand: 85, musky: 80, animalic: 75, earthy: 75 },
  fresh: { citrus: 95, floral: 70, woody: 65, oriental: 45, spicy: 50, green: 95, fruity: 85, gourmand: 40, musky: 70, animalic: 30, earthy: 55 },
  green: { citrus: 90, floral: 75, woody: 70, oriental: 50, spicy: 55, fresh: 95, fruity: 75, gourmand: 45, musky: 65, animalic: 35, earthy: 70 },
  fruity: { citrus: 80, floral: 85, woody: 55, oriental: 65, spicy: 60, fresh: 85, green: 75, gourmand: 90, musky: 75, animalic: 45, earthy: 50 },
  gourmand: { citrus: 50, floral: 70, woody: 75, oriental: 90, spicy: 85, fresh: 40, green: 45, fruity: 90, musky: 80, animalic: 70, earthy: 60 },
  musky: { citrus: 75, floral: 90, woody: 85, oriental: 90, spicy: 80, fresh: 70, green: 65, fruity: 75, gourmand: 80, animalic: 85, earthy: 75 },
  animalic: { citrus: 40, floral: 60, woody: 80, oriental: 85, spicy: 75, fresh: 30, green: 35, fruity: 45, gourmand: 70, musky: 85, earthy: 80 },
  earthy: { citrus: 55, floral: 65, woody: 90, oriental: 80, spicy: 75, fresh: 55, green: 70, fruity: 50, gourmand: 60, musky: 75, animalic: 80 }
};

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

  // Score based on percentage of overlap, but too much overlap isn't ideal (want some variety)
  const totalUnique = new Set([...notes1, ...notes2]).size;
  const overlapRatio = shared.length / totalUnique;

  // Optimal overlap is around 20-40% - enough similarity to blend well, not too much redundancy
  let score: number;
  if (overlapRatio < 0.1) {
    score = overlapRatio * 500; // 0-50 for very low overlap
  } else if (overlapRatio <= 0.4) {
    score = 50 + (overlapRatio - 0.1) * 166.7; // 50-100 for ideal range
  } else {
    score = 100 - (overlapRatio - 0.4) * 83.3; // Decrease for too much overlap
  }

  return { score: Math.min(100, Math.max(0, score)), shared };
}

function calculateFamilyHarmony(perfume1: Perfume, perfume2: Perfume): number {
  const families1 = getPerfumeFamilies(perfume1);
  const families2 = getPerfumeFamilies(perfume2);

  if (families1.size === 0 || families2.size === 0) {
    return 50; // Neutral if we can't determine families
  }

  let totalScore = 0;
  let comparisons = 0;

  for (const [fam1, count1] of families1) {
    for (const [fam2, count2] of families2) {
      const compatibility = fam1 === fam2
        ? 85 // Same family - good but not perfect
        : (FAMILY_COMPATIBILITY[fam1]?.[fam2] || 50);

      const weight = count1 * count2;
      totalScore += compatibility * weight;
      comparisons += weight;
    }
  }

  return comparisons > 0 ? totalScore / comparisons : 50;
}

function calculateLayerBalance(perfume1: Perfume, perfume2: Perfume): number {
  // Check if the combination covers all layers well
  const combinedTop = perfume1.topNotes.length + perfume2.topNotes.length;
  const combinedMiddle = perfume1.middleNotes.length + perfume2.middleNotes.length;
  const combinedBase = perfume1.baseNotes.length + perfume2.baseNotes.length;

  const total = combinedTop + combinedMiddle + combinedBase;
  if (total === 0) return 50;

  // Ideal ratio is roughly 30% top, 40% middle, 30% base
  const topRatio = combinedTop / total;
  const middleRatio = combinedMiddle / total;
  const baseRatio = combinedBase / total;

  // Score based on deviation from ideal
  const topDeviation = Math.abs(topRatio - 0.30);
  const middleDeviation = Math.abs(middleRatio - 0.40);
  const baseDeviation = Math.abs(baseRatio - 0.30);

  const avgDeviation = (topDeviation + middleDeviation + baseDeviation) / 3;

  // Convert deviation to score (0 deviation = 100, 0.3+ deviation = 0)
  return Math.max(0, 100 - (avgDeviation * 333));
}

function calculateAccordBlend(perfume1: Perfume, perfume2: Perfume): number {
  if (!perfume1.accords?.length || !perfume2.accords?.length) {
    return 70; // Neutral-positive if no accord data
  }

  // Check if dominant accords are compatible
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

function findComplementaryNotes(perfume1: Perfume, perfume2: Perfume): string[] {
  const notes1 = getAllNotes(perfume1);
  const notes2 = getAllNotes(perfume2);
  const complementary: string[] = [];

  // Notes that are unique to each perfume and belong to compatible families
  const families1 = new Set(notes1.map(getNoteFamily).filter(Boolean));

  for (const note of notes2) {
    const family = getNoteFamily(note);
    if (!family) continue;

    if (!notes1.map(normalizeNoteName).includes(normalizeNoteName(note))) {
      // Check if this note's family complements perfume1's families
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

  // Weighted average for final score
  const weights = {
    noteOverlap: 0.20,
    familyHarmony: 0.35,
    layerBalance: 0.20,
    accordBlend: 0.25
  };

  const score = Math.round(
    noteOverlapResult.score * weights.noteOverlap +
    familyHarmony * weights.familyHarmony +
    layerBalance * weights.layerBalance +
    accordBlend * weights.accordBlend
  );

  return {
    score,
    breakdown: {
      noteOverlap: Math.round(noteOverlapResult.score),
      familyHarmony: Math.round(familyHarmony),
      layerBalance: Math.round(layerBalance),
      accordBlend: Math.round(accordBlend)
    },
    sharedNotes: noteOverlapResult.shared,
    complementaryNotes: findComplementaryNotes(perfume1, perfume2),
    potentialClashes: findPotentialClashes(perfume1, perfume2)
  };
}

export { NOTE_FAMILIES, FAMILY_COMPATIBILITY, getNoteFamily };
