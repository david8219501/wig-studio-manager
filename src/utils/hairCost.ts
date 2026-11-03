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

// אורך בדיוק על אחד המפתחות (5, 10, 15...75) מחזיר את המשקל שלו בטבלה
// במדויק, בלי שינוי. אורך בין שני מפתחות (למשל 23, בין 20 ל-25) מקבל
// אינטרפולציה לינארית בין שני המשקלים הסמוכים - כדי שאורך חופשי (לא רק
// קפיצות של 5) יחושב בלי "קיפאון" מדומה על ערך המפתח הקרוב מתחת. אורך
// מחוץ לטווח הטבלה (מתחת ל-5 או מעל 75) נצמד לקצה הקרוב - שקול להתנהגות
// הישנה (floor-to-nearest-key), שכבר הייתה שקולה ל"הצמדה לקצה" מחוץ לטווח.
export function lookupBaseWeight(length: number): number {
  const keys = Object.keys(BASE_WEIGHTS).map(Number).sort((a, b) => a - b);
  const clamped = Math.min(Math.max(length, keys[0]), keys[keys.length - 1]);

  let lower = keys[0];
  for (const k of keys) {
    if (k <= clamped) lower = k;
  }
  let upper = keys[keys.length - 1];
  for (const k of keys) {
    if (k >= clamped) { upper = k; break; }
  }

  if (lower === upper) return BASE_WEIGHTS[lower];
  const ratio = (clamped - lower) / (upper - lower);
  return BASE_WEIGHTS[lower] + ratio * (BASE_WEIGHTS[upper] - BASE_WEIGHTS[lower]);
}

// חלק החישוב המשותף: בלאי 30% + מחיר לק"ג -> עלות, מתוך משקל נטו נתון.
// כשהמשקל כבר ידוע ישירות (למשל תיקון/שירות שמזין גרמים בעצמו, בלי
// אורך/מבנה/מלאות) קוראים לפונקציה הזו ישירות במקום calculateHairCost.
//
// בלאי 30% מוגדר כ-30% מהמשקל שנקנה (לא 30% מהמשקל הנטו): קונים X גרם,
// נשארים עם 70% שמישים (netGrams = X * 0.7) ו-30% הולכים לאיבוד בעיבוד.
// לכן המשקל שנקנה בפועל הוא netGrams / 0.7, לא netGrams * 1.3 - הנוסחה
// הקודמת (waste = netGrams * 0.3) הייתה שקולה ל-23.1% בלאי אמיתי מהמשקל
// שנקנה, לא 30%.
export function calculateHairCostFromGrams(netGrams: number, settings: HairCostSettings): HairCostResult {
  const purchasedGrams = netGrams / 0.7;
  const waste = purchasedGrams - netGrams;
  const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * purchasedGrams / 1000;
  return { netGrams, waste, hairCost };
}

export function calculateHairCost(input: HairCostInput, settings: HairCostSettings): HairCostResult {
  const base = lookupBaseWeight(input.length);
  const netGrams = base + (STRUCTURE_MOD[input.structure] || 0) + (FULLNESS_MOD[input.fullness] || 0);
  return calculateHairCostFromGrams(netGrams, settings);
}
