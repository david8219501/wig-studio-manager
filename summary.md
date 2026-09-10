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

## חלק ב': פיצ'ר "סגירת קוקו" + חלוקת בלאי אמיתי בדיעבד

**חלק ב' לא בוצע עדיין** - הודעת המשתמש שהגיעה נקטעה/הוכפלה
באמצע התיאור (בדיוק בנקודה "המערכת משווה בין המשקל שנקנה
(initialWeight) לסך כל הגרמים שתועדו בפועל (סכימת gramsUsed בכל
usedHairItems..." - חסר את שאר התיאור: מה קורה עם ההפרש שמתגלה
(הבלאי האמיתי), מה בפועל "סגירת קוקו" עושה ב-UI/ב-Firestore, ואיפה
הפיצ'ר הזה מוצג. יש לבקש מהמשתמש את שאר התיאור לפני שממשיכים.
