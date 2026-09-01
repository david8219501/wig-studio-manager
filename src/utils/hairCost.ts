// src/utils/hairCost.ts
// נוסחת חישוב עלות השיער הגולמית (משקל + בלאי + מחיר לק"ג) - בלי רווח/מרג'ין.
// מקור האמת היחיד לחישוב הזה: גם מחשבון הצעת המחיר (Calculators.tsx) וגם
// האומדן האוטומטי ביצירת הזמנה (NewOrderWizard.tsx) קוראים לפונקציה כאן,
// כדי שהתוצאה תמיד תהיה עקבית בין שני המקומות.

export const HAIR_LENGTH_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
export const STRUCTURE_OPTIONS = ["טופ", "סקין", "סרט"];
export const FULLNESS_OPTIONS = ["דליל", "קלאסי", "מלא"];

const BASE_WEIGHTS: Record<number, number> = {
  5: 110, 10: 140, 15: 170, 20: 200, 25: 230,
  30: 260, 35: 290, 40: 320, 45: 350, 50: 380,
  55: 410, 60: 440, 65: 470, 70: 500, 75: 530,
};

const STRUCTURE_MOD: Record<string, number> = { טופ: -50, סקין: -40, סרט: 0 };
const FULLNESS_MOD: Record<string, number> = { דליל: -30, קלאסי: 0, מלא: 30 };

export interface HairCostSettings {
  pricePerKgUsd: number;
  exchangeRate: number;
}

export interface HairCostInput {
  length: number;
  structure: string;
  fullness: string;
}

export interface HairCostResult {
  netGrams: number;
  waste: number;
  hairCost: number;
}

export function lookupBaseWeight(length: number): number {
  const keys = Object.keys(BASE_WEIGHTS).map(Number).sort((a, b) => a - b);
  let match = keys[0];
  for (const k of keys) {
    if (k <= length) match = k;
    else break;
  }
  return BASE_WEIGHTS[match];
}

// חלק החישוב המשותף: בלאי 30% + מחיר לק"ג -> עלות, מתוך משקל נטו נתון.
// כשהמשקל כבר ידוע ישירות (למשל תיקון/שירות שמזין גרמים בעצמו, בלי
// אורך/מבנה/מלאות) קוראים לפונקציה הזו ישירות במקום calculateHairCost.
export function calculateHairCostFromGrams(netGrams: number, settings: HairCostSettings): HairCostResult {
  const waste = netGrams * 0.3;
  const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * (netGrams + waste) / 1000;
  return { netGrams, waste, hairCost };
}

export function calculateHairCost(input: HairCostInput, settings: HairCostSettings): HairCostResult {
  const base = lookupBaseWeight(input.length);
  const netGrams = base + (STRUCTURE_MOD[input.structure] || 0) + (FULLNESS_MOD[input.fullness] || 0);
  return calculateHairCostFromGrams(netGrams, settings);
}
