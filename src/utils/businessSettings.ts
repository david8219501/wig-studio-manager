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
