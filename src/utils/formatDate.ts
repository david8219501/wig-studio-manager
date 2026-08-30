// src/utils/formatDate.ts
// עיצוב תאריכים בעברית - מקור אחד לכל האתר, כדי שהתצוגה תמיד תיראה אותו
// דבר (למשל DD/MM/YYYY עם "/" ולא "." ) ולא תלויה בפרשנות ה-Intl/locale
// הספציפית של הדפדפן/מערכת ההפעלה שמריצה אותה - בדיוק כמו הסיבה ש-
// DateInput/CustomSelect לא משתמשים ברכיבי דפדפן מובנים. כל הפורמט כאן
// מיוצר ידנית מטבלאות קבועות, לא דרך toLocaleDateString.

const MONTH_NAMES_LONG = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const MONTH_NAMES_SHORT = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];
const WEEKDAY_NAMES_LONG = [
  "יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת",
];

export interface FormatDateILOptions {
  weekday?: "long";
  month?: "numeric" | "short" | "long";
}

// "YYYY-MM-DD" מפורש כתאריך מקומי (בלי שעה) כדי למנוע הזחה של יום אחורה/
// קדימה שיכולה לקרות עם new Date("YYYY-MM-DD") (מתפרש כ-UTC חצות). כל קלט
// אחר (מחרוזת ISO עם שעה, או Date קיים) מטופל כרגיל דרך new Date.
function toLocalDate(input: Date | string): Date {
  if (input instanceof Date) return input;
  const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(input);
}

// תבנית ברירת מחדל (בלי options): DD/MM/YYYY, בדיוק כמו formatDateToIL
// הישן שהיה כפול ב-Calendar.tsx. עם month: "short"/"long" - תבנית מילולית
// ("30 באוגוסט 2026"), עם weekday: "long" בנוסף - יום בשבוע בהתחלה.
export function formatDateIL(input: Date | string, options: FormatDateILOptions = {}): string {
  const date = toLocalDate(input);
  const { weekday, month = "numeric" } = options;

  if (month === "numeric") {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  const monthName = month === "long" ? MONTH_NAMES_LONG[date.getMonth()] : MONTH_NAMES_SHORT[date.getMonth()];
  const datePart = `${date.getDate()} ב${monthName} ${date.getFullYear()}`;
  return weekday ? `${WEEKDAY_NAMES_LONG[date.getDay()]}, ${datePart}` : datePart;
}

// שם החודש בלבד (לתוויות גרפים/צירים) - בלי יום/שנה.
export function getMonthNameIL(input: Date | string, style: "short" | "long" = "short"): string {
  const date = toLocalDate(input);
  return style === "long" ? MONTH_NAMES_LONG[date.getMonth()] : MONTH_NAMES_SHORT[date.getMonth()];
}
