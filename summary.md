# סיכום: 4 תיקוני קוד לפי REVIEW.md (בסדר, כל אחד עם commit+push נפרד)

## שלב 1: איחוד נוסחת עלות שיער ב-Calculators.tsx (RepairsCalculator)

`RepairsCalculator` שכפל ידנית את נוסחת הבלאי (30%) ועלות השיער
(`waste = g*0.3`, `hairCost = ...`) במקום להשתמש בפונקציה המשותפת
`calculateHairCostFromGrams` שכבר קיימת ב-`src/utils/hairCost.ts`
ומיובאת כבר ב-`RepairOrderForm.tsx`. הוחלף לקריאה לאותה פונקציה, כך
שיש עכשיו מקור אמת יחיד לנוסחה בכל האתר (Calculators.tsx,
NewOrderWizard.tsx, RepairOrderForm.tsx). קומיט `583df33`.

## שלב 2: שינוי שם הפונקציה המטעה

`createOrderWithProductionExpense` ב-`src/utils/orderCreation.ts` כבר
לא יוצרת רשומת `expenses` (בוטל בעבר - ראו הערה בראש הקובץ), אז השם
היה מטעה. שונה ל-`createOrder`, ועודכנו כל 3 נקודות הקריאה
(`NewOrderWizard.tsx`, `RepairOrderForm.tsx`, `QuickRetailSaleModal.tsx`)
וגם `CLAUDE.md`. קומיט `51875af`.

## שלב 3: הודעות שגיאה עקביות בכל הדפים

`Clients.tsx` הוא הדוגמה היחידה באתר עם UI אמיתי למצב טעינה/שגיאה
(spinner + הודעה קריאה). בכל שאר הדפים - `Inventory.tsx`, `Sales.tsx`,
`Expenses.tsx`, `Calendar.tsx`, `Dashboard.tsx`, `Reports.tsx`,
`Calculators.tsx` - שגיאת `onSnapshot`/`getDoc` הלכה רק ל-
`console.error`, בלי שום משוב למשתמשת. נוסף `loading`/`loadError`
state בכל דף מהרשימה, עם אותו דפוס בדיוק (spinner + הודעת שגיאה
ברורה, "בדקי את החיבור ונסי לרענן את הדף") ו-CSS תואם בקובץ ה-CSS
העצמאי של כל דף (`.{page}-state`, `.{page}-state--error`, spinner
מסתובב). ב-Calculators.tsx (getDoc בודד ל-businessSettings) מוצגת
הודעת שגיאה בלי לחסום את המחשבונים עצמם, כי הם ממשיכים לעבוד עם ערכי
ברירת מחדל. קומיט `c926c7f`.

## שלב 4: פונקציית עיצוב תאריך משותפת

`Calendar.tsx` הגדיר `formatDateToIL` מקומית (DD/MM/YYYY ידני), בעוד
`Dashboard.tsx`, `Reports.tsx` ו-`RemnantMergeLogModal.tsx` השתמשו
ב-`toLocaleDateString("he-IL")` ישירות - תלוי בפרשנות ה-locale
הספציפית של הדפדפן/מערכת ההפעלה (אותה בעיית עקרון כמו שכבר טופלה
ב-DateInput/CustomSelect: לא לסמוך על רכיבים/API מובנים של הדפדפן).
תוך כדי הבדיקה התגלה גם שימוש רביעי-בפועל: `Calendar.tsx` עצמו הכיל
עוד קריאת `toLocaleDateString` ישירה (כותרת התצוגה היומית), נוסף
ל-`formatDateToIL` המקומית - גם הוא תוקן.

נוצר `src/utils/formatDate.ts` עם שתי פונקציות, מיושמות מטבלאות שמות
עבריות קבועות (לא Intl):
- `formatDateIL(date, options?)` - ברירת מחדל: `DD/MM/YYYY`; עם
  `{ month: "long"/"short", weekday: "long" }` - תבנית מילולית
  ("יום שני, 30 באוגוסט 2026").
- `getMonthNameIL(date, style)` - שם חודש בלבד, לתוויות גרפים/צירים.

הוחלפו כל 4 מקומות השימוש (5 קריאות בפועל) לפונקציה המשותפת, ועודכן
CLAUDE.md. קומיט `40fbf94`.

## בדיקות שבוצעו בכל 4 השלבים

- `npm run build` (tsc -b + vite build) עבר נקי אחרי כל שלב.
- `npm run lint` נבדק אחרי שלבים 3-4 - אין שגיאות/אזהרות חדשות
  בקבצים שנערכו (השגיאות הקיימות מה-linter הן `react-hooks/set-state-in-effect`
  ישנות ולא קשורות, כמתועד ב-REVIEW.md).
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל - מומלץ לבדוק ידנית (בעיקר
  את מסכי הטעינה/שגיאה החדשים ואת פורמט התאריכים) לפני סמיכה מלאה.
