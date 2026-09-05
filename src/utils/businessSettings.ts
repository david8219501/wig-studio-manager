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

// שעות פעילות - businessSettings/{businessId}.workingHours, אובייקט
// לכל יום בשבוע. מפתחות באנגלית (יציבים, לא תלויי-תרגום) - התווית
// העברית נגזרת מ-WEEK_DAYS בכל מקום שמציג את זה.
export interface DayWorkingHours {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  closed: boolean;
}

export type WorkingHours = Record<string, DayWorkingHours>;

export const WEEK_DAYS: { key: string; label: string }[] = [
  { key: "sunday", label: "ראשון" },
  { key: "monday", label: "שני" },
  { key: "tuesday", label: "שלישי" },
  { key: "wednesday", label: "רביעי" },
  { key: "thursday", label: "חמישי" },
  { key: "friday", label: "שישי" },
  { key: "saturday", label: "שבת" },
];

// ברירת מחדל סבירה לסלון פאות ישראלי - פתוח א'-ה' יום מלא, שישי מקוצר,
// שבת סגור. ניתנת לעריכה מלאה בהגדרות - זו רק נקודת פתיחה.
export const DEFAULT_WORKING_HOURS: WorkingHours = {
  sunday: { open: "09:00", close: "19:00", closed: false },
  monday: { open: "09:00", close: "19:00", closed: false },
  tuesday: { open: "09:00", close: "19:00", closed: false },
  wednesday: { open: "09:00", close: "19:00", closed: false },
  thursday: { open: "09:00", close: "19:00", closed: false },
  friday: { open: "09:00", close: "14:00", closed: false },
  saturday: { open: "09:00", close: "19:00", closed: true },
};
