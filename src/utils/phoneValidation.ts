// src/utils/phoneValidation.ts
// וולידציית פורמט בסיסית למספר טלפון ישראלי - 9-10 ספרות, מתחיל ב-0
// (טלפון מקומי) או בקידומת בינלאומית +972. בשימוש בהרשמה (Login.tsx)
// ובלקוחות (AddClientModal.tsx) - מקור אחד ל-regex, לא משוכפל.
export function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^(0\d{8,9}|\+972\d{8,9})$/.test(cleaned);
}
