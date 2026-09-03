// src/utils/orderStatus.ts
// מקור אמת יחיד לאפשרויות סטטוס הזמנה - משמש גם ב-Sales.tsx (עריכת סטטוס
// בטבלה) וגם ב-OrderDetailsPanel.tsx (עריכת סטטוס בפאנל), כדי ששני המקומות
// יתמכו בדיוק באותם ערכים בלי כפילות קוד.

// ערך-סמן לבחירת "אחר / הוסף חדש" בסטטוס ההזמנה - אותו דפוס בדיוק כמו
// OTHER_APPOINTMENT_TYPE ב-Calendar.tsx. לא נשמר בפועל כ-status - רק פותח
// שדה טקסט חופשי.
export const OTHER_STATUS = "__other__";

export const KNOWN_STATUSES = ["new", "in_progress", "styling", "ready", "delivered"];

export const STATUS_SELECT_OPTIONS = [
  { value: "new", label: "חדשה 🆕" },
  { value: "in_progress", label: "בטיפול ⏳" },
  { value: "styling", label: "בסירוק 💇‍♀️" },
  { value: "ready", label: "מוכנה לאיסוף 🎁" },
  { value: "delivered", label: "נמסרה ✅" },
  { value: OTHER_STATUS, label: "אחר / הוסף חדש" },
];
