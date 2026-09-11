// src/utils/businessSettings.ts
// ברירות מחדל לרשימות ניתנות-להתאמה-אישית שנשמרות ב-businessSettings/{businessId}
// (מסמך שכבר קיים לתמחור - ראו Calculators.tsx). כל צרכן (Expenses.tsx,
// Calendar.tsx, Settings.tsx) טוען מכאן את אותן ברירות מחדל בדיוק, כדי
// שאתחול ראשוני (אם עדיין אין את השדה בפועל) יהיה זהה בכל מקום.
export const DEFAULT_EXPENSE_CATEGORIES = [
  "מלאי ושיער",
  "שכירות ומבנה",
  "שיווק ופרסום",
  "שכר עובדות",
  "ייצור הזמנות",
  "שונות",
];

export const DEFAULT_APPOINTMENT_TYPES = [
  "מדידת פאה חדשה",
  "תיקון רשת",
  "סירוק והחלקה",
  "מסירת פאה מוכנה",
];

// תאימות לאחור: הוצאות ישנות שנשמרו לפני המעבר לרשימה חופשית-לפי-עסק
// עדיין מחזיקות מפתח אנגלי קבוע (category: "inventory" וכו') במקום
// הטקסט העברי החדש. לא בוצעה מיגרציה בפועל על נתונים קיימים - זו רק
// מפת תרגום לתצוגה, כדי שרשומות ישנות ימשיכו להיראות תקין.
export const LEGACY_EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  inventory: "מלאי ושיער",
  rent: "שכירות ומבנה",
  marketing: "שיווק ופרסום",
  salaries: "שכר עובדות",
  production: "ייצור הזמנות",
  other: "שונות",
};

// בדיקה משותפת - האם הוצאה מסוימת היא "מלאי וספקים" (לא הוצאה תפעולית
// כללית) - כולל תאימות לאחור למפתח האנגלי הישן ("inventory") ולערך
// העברי החדש ("מלאי ושיער"). משמש ב-Expenses.tsx (פילוח "הוצאות מלאי
// וספקים" מול "תפעול ושיווק") וב-Dashboard.tsx ("רווח החודש" - מחסיר
// רק הוצאות תפעול/שיווק, כי הוצאות מלאי כבר מגולמות בעלות הייצור של
// כל הזמנה דרך calculateOrderProfit - כפל-ספירה אחרת אם ייכללו גם כאן).
export function isInventoryExpenseCategory(category: string): boolean {
  return category === "inventory" || category === "מלאי ושיער";
}
