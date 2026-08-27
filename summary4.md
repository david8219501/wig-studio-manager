# סיכום - תיקון תג "משוער" + פיצ'ר קופסת שאריות שיער

`tsc -b`, `eslint`, `npm run build` נבדקו בכל שלב. `tsc`/`build` נקיים
לגמרי; `eslint` נשאר עם אותו דפוס קיים (`react-hooks/set-state-in-effect`
באיפוס state בפתיחת מודל) + מופע חדש אחד ב-`MergeRemnantModal.tsx`
החדש, עקבי עם כל שאר המודלים בקוד - לא תוקן בכוונה, כמו בסבבים קודמים.

## 1. תיקון תג "משוער"

- **`src/pages/Sales/Sales.tsx`** - `isEstimatedProfit` עודכן ל-
  `(ord.hairCostEstimated ?? 0) > 0 && (!ord.usedHairItems || ord.usedHairItems.length === 0)`.
  מוצר קמעונאי/פאת תצוגה (ששולחים `hairCostEstimated: 0`) כבר לא יסומנו
  "משוער" - הרווח שלהם מדויק מהרגע הראשון.

## 2. קופסת שאריות שיער

**נוצרו:**
- **`src/pages/Inventory/CreateRemnantBoxModal.tsx`** - טופס קטן ליצירת
  קופסה חדשה (`isRemnantBox: true`, `currentWeight/remnantTotalValue: 0`,
  `status: 'available'`), רק שם ("ספק" בפועל) + גוון/תיאור; שאר השדות
  (אורך/משקל/עלות/מרקם) מקבלים ערכי ברירת מחדל לא-רלוונטיים (0 / '-').
- **`src/pages/Inventory/MergeRemnantModal.tsx`** - מיזוג קוקו קטן
  (שארית, `currentWeight > 0`) לתוך קופסה קיימת: מציג select של קופסאות
  זמינות (`isRemnantBox && status==='available'`) - אם יש רק אחת, היא
  נבחרת אוטומטית כברירת מחדל; מחשב `remainingValue = costPrice * (currentWeight/initialWeight)`
  ומעביר אותו החוצה דרך `onConfirm(boxId)`.

**שונו:**
- **`src/types/index.ts`** - `HairItem` מקבל `isRemnantBox?: boolean` +
  `remnantTotalValue?: number`.
- **`src/pages/Inventory/Inventory.tsx`**:
  - כפתור "+ צור קופסת שאריות" ליד "+ קליטת קוקו חדש".
  - `handleCreateRemnantBox` - `setDoc` בלבד, **בלי** קריאה ל-
    `createInventoryExpense` (קופסה לא נרכשת, היא נוצרת ריקה - הרכישה
    המקורית של השארית שבפנים כבר נרשמה כהוצאה כשהקוקו המקורי נקלט).
  - `handleMergeIntoRemnantBox(boxId)` - מעדכן את הקופסה
    (`currentWeight += מקור.currentWeight`, `remnantTotalValue += remainingValue`)
    ומאפס את הקוקו המקורי (`currentWeight: 0, status: 'depleted'`).
  - טבלת "מלאי שיער ייחודי" קיבלה עמודת **"פעולות"** חדשה - כפתור
    "📦 מזג לשאריות" לכל שורה עם `currentWeight > 0` שאינה קופסת שאריות
    בעצמה (colSpan של שורת "אין תוצאות" עודכן ל-11 בהתאם).
  - תצוגת שורת קופסת שאריות: 📦 לפני השם, "—" בעמודות לא-רלוונטיות
    (אורך/משקל התחלתי/מרקם/סוג שיער), ועמודת "עלות רכישה" מציגה
    "מחיר ממוצע לגרם: ₪X" (`remnantTotalValue/currentWeight`) במקום
    `costPrice`.
- **`src/pages/Inventory/Inventory.css`** - `.merge-remnant-btn` (סגנון
  קטן, בגוון accent, כמו `.retail-sale-btn` אבל בצבע אחר כדי לא להתבלבל
  עם "מכירה").
- **`src/components/orders/AssignHairModal.tsx`**:
  - נוספה `costForGrams(item, grams)` - פונקציית עזר משותפת: לקוקו רגיל
    הנוסחה הרגילה (`costPrice * grams/initialWeight`), לקופסת שאריות
    `grams * (remnantTotalValue/currentWeight)`. משמשת גם ב-`previewCost`
    וגם ב-`handleAdd`, כדי שלא תהיה נוסחה כפולה.
  - קופסת שאריות מופיעה ברשימת הבחירה הרגילה (היא כבר `status: 'available'`)
    עם תווית מיוחדת: "📦 {id}", "קופסת שאריות · {color}", ומחיר ממוצע
    לגרם נוכחי - שונה מהצגת קוקו רגיל.
  - `handleAdd`: כשמשייכים מקופסת שאריות, גם `remnantTotalValue` בקופסה
    יורד ב-`costAtTime` (בנוסף ל-`currentWeight`); ה-`hairItemLabel`
    שנשמר בהזמנה מסומן "📦 ... קופסת שאריות (...)".
  - `handleRemove`: **תוספת מעבר למפורש בדרישה** - בביטול שיוך מקופסת
    שאריות, מחזירים גם את `remnantTotalValue` (`+= removed.costAtTime`),
    לא רק `currentWeight`. בלי זה, ביטול שיוך היה משאיר את שווי הקופסה
    חסר לצמיתות - נדרש לסימטריה עם הוספה/הסרה שכבר קיימת לקוקו רגיל.

**קוקו רגיל: ללא שינוי בהתנהגות** - כל הנוסחאות/עדכונים ל-`isRemnantBox`
מותנים מפורשות ולא נוגעים בנתיב הקיים כשהדגל לא מסומן.
