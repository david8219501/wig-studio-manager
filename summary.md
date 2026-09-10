# סיכום: "ביטול סגירת קוקו" (שחזור בלאי) ✅ הושלמה

תוספת לפיצ'ר "סגירת קוקו" הקיים (Inventory.tsx) - מאפשרת לבטל סגירה
שבוצעה בטעות, ולשחזר בדיוק את מה שהשתנה.

## יומן חלוקה מדויק - שדות חדשים ב-HairItem (types/index.ts)

- **`wasteReconciliationLog?: WasteReconciliationLogEntry[]`** -
  `{orderId, entryIndex, amountAdded}[]` לכל שיוך שהושפע בסגירה
  האחרונה. נשמר ב-`handleConfirmCloseHairItem` (עודכן) **תוך כדי**
  חלוקת הבלאי - לא מחושב מחדש בהמשך, בדיוק כמבוקש ("לא להסתמך על
  חישוב מחדש מאוחר יותר, שעלול לתת תוצאה שגויה אם ההזמנה נערכה
  בינתיים").
- **`wasteReconciledFromStatus?: HairItem['status']`** - הסטטוס
  שהיה על הקוקו ממש לפני הסגירה (בפועל תמיד `'available'` היום, אבל
  נשמר במפורש כדי שביטול ישחזר בדיוק, לא יניח ערך גורף - כמבוקש).

## כפתור "↩ ביטול סגירה / שחזור בלאי" - HairItemDetailsPanel.tsx

מוצג **במקום** כפתור "סגירת קוקו" (לא לצדו) - שני מצבים סותרים של
אותו פריט, מבחין ביניהם `item.wasteReconciledAt`. לא רלוונטי לקופסת
שאריות (אותה החרגה כמו הכפתור המקורי).

## הביטול בפועל - handleConfirmUndoCloseHairItem (Inventory.tsx)

עובר על `wasteReconciliationLog`, מקבץ לפי `orderId` (הזמנה יכולה
להחזיק כמה רשומות), ולכל רשומה **מחסר בדיוק** את `amountAdded`
מ-`costAtTime` של אותו `entryIndex` (לא מאפס, לא מחשב מחדש). בסיום -
`updateDoc` על הקוקו: `status` חוזר ל-`wasteReconciledFromStatus`
(או `'available'` אם חסר), ו-`wasteReconciledAt`/
`wasteReconciledFromStatus`/`wasteReconciliationLog` **מוסרים
לגמרי** (`deleteField()`, לא `undefined`/מחרוזת ריקה) - כדי שאפשר
יהיה "לסגור" את הקוקו שוב בעתיד.

**הגנת מקרה קצה:** לכל רשומה בלוג - אם `entryIndex` לא קיים יותר
במערך, **או** קיים אבל מצביע על `usedHairItems` entry עם
`hairItemId` **שונה** (למשל בגלל שרשומה קודמת הוסרה מהמערך וכל
האינדקסים שאחריה זזו) - מדלגים בשקט (אי אפשר לשחזר למשהו שכבר לא
קיים). בסיום מוצגת הודעת סיכום ("שוחזרו X רשומות בהצלחה, Y דולגו...")
בבאנר חדש (`.hair-undo-result-banner`, מעל אזור הפילטרים בטאב "מלאי
שיער ייחודי") - ניתן לסגירה, לא נעלם אוטומטית.

## עדכון קטן ב-ConfirmDialog הקיים של הסגירה

הטקסט "הפעולה לא ניתנת לביטול" הוסר מהודעת האישור המקורית של
"סגירת קוקו" (כבר לא נכון) והוחלף בהפניה לכפתור הביטול החדש.

**קבצים:** `types/index.ts` (שני שדות חדשים + `WasteReconciliationLogEntry`),
`Inventory.tsx` (state/handler חדשים, `ConfirmDialog` חדש, באנר
תוצאה, `deleteField` נוסף ל-import), `Inventory.css`
(`.hair-undo-result-banner`), `HairItemDetailsPanel.tsx`
(prop+כפתור מותנה חדשים).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
