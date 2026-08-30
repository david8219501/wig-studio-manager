# סיכום: פישוט טבלת "פאות תצוגה" - טבלה מצומצמת + פאנל פרטים

אותו דפוס בדיוק שכבר עבד ב-Sales.tsx (טבלה מצומצמת, פאנל נשלף בלחיצה
על שורה במקום כפתורי פעולה בכל שורה).

## הטבלה - 4 עמודות בלבד

מזהה/ברקוד | מפרט (`order.notes`, כבר תקציר קצר) | מחיר מכירה מבוקש |
סטטוס (`CustomSelect` אינטרקטיבי, נשאר כפי שהיה - עדכון ידני מיידי
בלי לפתוח כלום, עם `stopPropagation` כדי לא לפתוח את הפאנל בטעות
בלחיצה עליו). הוסרו: עמודת "עלות מחושבת" וחמשת כפתורי הפעולה
הנפרדים מהשורה. כל שורה (`tr.showroom-row`) פותחת את הפאנל בלחיצה -
אותו דפוס בדיוק כמו `.sales-row` ב-Sales.css.

## `ShowroomStockDetailsPanel.tsx` + `.css` (חדש)

פאנל נשלף מהצד, אותו דפוס עיצובי מדויק כמו `OrderDetailsPanel.tsx`
(overlay + פאנל `position:fixed` + אנימציית slide-in), אבל **עצמאי
לחלוטין** - קובץ CSS משלו (`ShowroomStockDetailsPanel.css`) עם כל
המחלקות בקידומת `showroom-details-` (לא תלוי ב-`Inventory.css`/
`OrderDetailsPanel.css`, בדיוק כמו כל מודל אחר בפרויקט).

מציג: מפרט מלא (אורך/מבנה/מלאות/גוון מ-`showroomSpecs`, לא רק
התקציר), פירוט `usedHairItems` ו-`usedBulkItems` (אותה רשימה כמו
ב-`OrderDetailsPanel.tsx`), עלות מחושבת כוללת (שיער + מלאי פשוט יחד)
ומחיר מכירה מבוקש. בתחתית: 4 כפתורי פעולה (ניהול שיוך שיער/ניהול
פריטי מלאי/עריכה/מכירה, מודגשים ב-accent/primary) + כפתור "מחיקה"
נפרד מבחינה ויזואלית (צבע `--color-danger`, במיקום נבדל בקצה השורה) -
אותו דפוס אזהרה שכבר קיים ב-`ConfirmDialog`/`showroom-delete-btn`
הקודם.

הפאנל עצמו **לא** מבצע שום פעולת Firestore - רק מציג ומעביר callbacks
(`onOpenAssignHair`/`onOpenAssignBulkItems`/`onOpenEdit`/`onOpenSell`/
`onDelete`) בחזרה ל-`Inventory.tsx`, ששם ממשיך להתנהל כל ה-state
הקיים (`assigningShowroomOrderId` וכו') בלי שינוי בלוגיקה עצמה - רק
בנקודת הכניסה אליה.

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות ב-`Inventory.tsx` או
  ב-`ShowroomStockDetailsPanel.tsx`.
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל (פתיחת הפאנל, האנימציה,
  שכבות ה-z-index מול המודלים שנפתחים מתוכו) - מומלץ לבדוק ידנית
  לפני סמיכה מלאה.
