# סיכום: תיקון נוסחת בלאי + פיצ'ר "סגירת קוקו" (2 חלקים)

## חלק א': תיקון נוסחת ה-30% המשוערת ב-hairCost.ts ✅ הושלמה

**הקוד המדויק שנבדק** (`calculateHairCostFromGrams`, לפני התיקון):
```ts
const waste = netGrams * 0.3;
const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * (netGrams + waste) / 1000;
```

**האבחנה אושרה:** זו הנוסחה הלא-מדויקת. `waste = netGrams * 0.3` שקול
ל-`purchased = netGrams * 1.3`, ו-30/130 = **23.1%** בלאי אמיתי
מהמשקל שנקנה - לא 30%. הנוסחה הנכונה: קונים X גרם, 30% מהם הולך
לאיבוד, נשארים עם 70% שמישים (`netGrams = X * 0.7`) - כלומר
`X = netGrams / 0.7`.

**התיקון** (`src/utils/hairCost.ts`):
```ts
const purchasedGrams = netGrams / 0.7;
const waste = purchasedGrams - netGrams;
const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * purchasedGrams / 1000;
```

**תיקון אחד מספיק לכל האתר:** `Calculators.tsx` (שני המחשבונים -
הצעת מחיר ושדרוגים/תיקונים), `NewOrderWizard.tsx`, ו-`RepairOrderForm.tsx`
כולם קוראים ל-`calculateHairCostFromGrams`/`calculateHairCost`
(שקוראת לה) מ-`hairCost.ts` בלבד - נבדק ב-grep שאין אף חישוב
עצמאי/כפול במקום אחר. כל 4 מקומות התצוגה (`ResultRow`/הודעות טקסט)
רק מציגים את `waste`/`hairCost` שמוחזרים - שום מקום לא היה צריך
עדכון נפרד.

**לא נגעתי** (כמבוקש): חישוב העלות המדויקת של שיוך שיער אמיתי
(`usedHairItems`, `costPrice * gramsUsed/initialWeight`) - זה כבר
מדויק לגמרי ולא תלוי בהערכת ה-30% המשוערת.

**קבצים:** `src/utils/hairCost.ts` בלבד.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק ב': פיצ'ר "סגירת קוקו" + חלוקת בלאי אמיתי בדיעבד ✅ הושלמה

**שדה חדש:** `HairItem.wasteReconciledAt?: string` (`types/index.ts`)
- ISO timestamp שנקבע כשהבלאי חושב וחולק; משמש כחסם יחיד למניעת
סגירה כפולה (לא בודק גם `status`, כדי שלא להתבלבל עם 'depleted'
שיכול להיקבע גם ממיזוג לשאריות בנתיב אחר).

**כפתור חדש ב-`HairItemDetailsPanel.tsx`:** "🔒 סגירת קוקו - חישוב
בלאי בפועל" - מוצג רק כש-`!isRemnant && !item.wasteReconciledAt`
(קופסת שאריות מנוהלת בשווי דינמי, `remnantTotalValue`, לא
`initialWeight`/`costPrice` - המודל הזה לא רלוונטי לה בכלל).

**החישוב** (`closingSummary`, `useMemo` ב-`Inventory.tsx`, נגזר
מ-`hairItems`/`orders` שכבר טעונים - בלי query נוסף): עובר על **כל**
ה-`orders` של העסק (`orders` כבר לא מסונן לפי status - כל הסטטוסים
כולל "נמסרה"/"נמכרה"/"בוטלה" נכללים, כמבוקש במפורש "לא רק פתוחות"),
אוגר כל `usedHairItems` entry שמצביע על הקוקו הנבחר (`orderId` +
אינדקס במערך + `gramsUsed` שלו - **entry בודד, לא הזמנה** - הזמנה
יכולה להכיל כמה שיוכים לאותו קוקו אם שויך בכמה פעימות). `waste =
initialWeight - totalGramsUsed`. `wasteCost = costPrice *
waste/initialWeight` (רק אם `waste > 0`).

**ה-`ConfirmDialog`** (משתמש ברכיב המשותף הקיים, לא מודל ייעודי -
עקבי עם דפוס `undoConfirm` הקיים לאזהרות מרובות-שורות) מציג את כל
המספרים (משקל שנקנה/גרמים שתועדו/בלאי בגרם+₪), ונוסח שונה בין בלאי
חיובי (מזהיר במפורש שהרווח המוצג של הזמנות - כולל כבר-סגורות -
יתעדכן) לבלאי אפסי/שלילי (רק "אין בלאי לחלוקה, נסגר בלי לשנות הזמנה").

**השמירה** (`handleConfirmCloseHairItem`): מקבצת את ה-entries לפי
`orderId` (כי הזמנה יחידה יכולה להחזיק כמה entries לאותו קוקו),
ולכל הזמנה - מוסיפה (**לא** דורסת) ל-`costAtTime` של כל entry
רלוונטי את חלקו היחסי (`wasteCost * entry.gramsUsed/totalGramsUsed`),
ושומרת `updateDoc(orders/{id}, { usedHairItems: ... })`. **לא נדרש
שדה `productionCost`/`profit` נפרד** - שניהם מחושבים חי מ-`usedHairItems`
(`calculateOrderProductionCost`/`calculateOrderProfit` ב-`orderProfit.ts`),
אז עדכון המערך מספיק לעדכן את התצוגה בכל מקום (Sales/Dashboard/Reports)
אוטומטית. לבסוף - `updateDoc(hairItems/{id}, { status: 'depleted',
wasteReconciledAt: <now> })`.

**מגבלה ידועה שלא טופלה (מחוץ לתחום המפרט המדויק):** אם קוקו שימש
גם כמקור למיזוג-לשאריות (`handleMergeIntoRemnantBox`) לפני "סגירה",
המשקל שהועבר לקופסה לא מנוכה מ-`waste` (המפרט הגדיר בלאי כ-
`initialWeight - totalGramsUsed מ-usedHairItems` בלבד, בלי להזכיר
מיזוגים) - זה יכול לנפח את הבלאי המחושב במקרה קצה כזה. לא תוקן כי
לא התבקש; מצוין כאן לתשומת לב.

**קבצים:** `types/index.ts`, `Inventory.tsx` (state/`closingSummary`/
`handleConfirmCloseHairItem`/`ConfirmDialog` חדש), `HairItemDetailsPanel.tsx`
(prop+כפתור חדשים).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
