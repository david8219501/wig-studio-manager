# סיכום: עדכון עיצוב ShowroomStockDetailsPanel.tsx - התאמה ל-OrderDetailsPanel.tsx

## 1. שיוך שיער - כפתור מוטבע באזור עצמו

כפתור "🧵 ניהול שיוך שיער" עבר משורת הכפתורים בתחתית לתוך כותרת אזור
"שיוך שיער בפועל" עצמו (`showroom-details-section-title-row`, אותו
דפוס בדיוק כמו `order-details-section-title-row` ב-OrderDetailsPanel.tsx) -
`h3` + כפתור accent זה-לצד-זה. הרשימה שמציגה קוקוים משויכים לא השתנתה.

## 2. פריטי מלאי - טופס הוספה מוטבע במקום מודל נפרד

הוסר `AssignBulkItemsModal.tsx` **לגמרי** (נמחק - אין עוד קורא לו).
הלוגיקה שלו (`loadBulkItemsCatalog`/`handleAddBulkItem`/
`handleRemoveBulkItem`, זהה ל-`OrderDetailsPanel.tsx`) הועברה ישירות
לתוך `ShowroomStockDetailsPanel.tsx` - הרכיב הפך מ"תצוגה בלבד" לרכיב
עם state/כתיבות Firestore משלו (בדיוק כמו `OrderDetailsPanel.tsx`).
בתוך אזור "פריטי מלאי שנוצלו": רשימה עם כפתור הסרה לכל שורה + טופס
מוטבע (`CustomSelect` לבחירת פריט - לא `<select>` מובנה, כדי לא
להכניס מחדש את אותו באג מיקום - שדה כמות, כפתור "+ הוסף פריט"),
אותו וולידציית מלאי (`bulkQtyExceedsStock`) כמו בכל מקום אחר באתר.

## 3. כפתורי תחתית - 3 בלבד

נשארו: עריכה (secondary), מכירה (primary), מחיקה (danger, מובדל
ויזואלית בקצה השורה). "ניהול שיוך שיער" ו"ניהול פריטי מלאי" עברו
לאזורים שלהם (סעיפים 1-2).

## 4. מזהה קצר בכותרת - כבר ממומש, אומת

`order.showroomCode || order.id` כבר היה בכותרת הפאנל מהתיקון הקודם -
אומת end-to-end (`ShowroomStockFormModal.tsx` כותב אותו ביצירה,
`Inventory.tsx` מחשב את הבא בתור, הטבלה והפאנל מציגים אותו) - לא
נדרש שינוי. פריטים שנוצרו לפני התיקון (בלי `showroomCode`) ימשיכו
להציג את ה-ID הארוך כ-fallback, בדיוק כמתוכנן.

## `Inventory.tsx`

הוסרו: `assigningBulkItemsOrderId`, `assigningBulkItemsOrder`,
ה-import וה-render של `AssignBulkItemsModal`, ו-prop
`onOpenAssignBulkItems` מהפאנל (לא רלוונטי יותר - ההוספה קורית ישירות
בפאנל עצמו).

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות; `ShowroomStockDetailsPanel.tsx`
  מציג את אותה אזהרת `react-hooks/set-state-in-effect` הקיימת כבר
  ב-`OrderDetailsPanel.tsx` (אותו דפוס reset-on-open בדיוק).
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל - מומלץ לבדוק ידנית לפני סמיכה
  מלאה, בפרט את מיקום ה-`CustomSelect` בטופס המוטבע.
