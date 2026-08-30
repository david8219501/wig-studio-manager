# סקירה מקיפה של המערכת - ממצאים לתכנון (לא תיקונים בפועל)

תאריך: 2026-08-30. נבדק שיטתית: כל דף ב-`src/pages/`, כל מודל ב-
`src/components/modals` ו-`src/components/orders`, רכיבים משותפים
ב-`src/components/common`, וכל שכתוב/קורא ל-Firestore (`grep` על
`collection(`/`doc(`/`addDoc`/`setDoc`/`updateDoc` בכל הפרויקט).

זהו מסמך לקריאה ותכנון בלבד - שום קובץ קוד לא שונה במשימה הזו.

---

## 🔴 קריטי - אבטחה ותקינות נתונים

### 1. פער נוסף ב-Firestore Rules, זהה בדיוק ל-`businessSettings`: collection `users`

**איפה:** `src/App.tsx:125` (`setDoc(doc(db, "users", user.uid), {...})`),
`src/components/modals/AddClientModal.tsx:105`, `src/pages/Dashboard/Dashboard.tsx:67`.

**הבעיה:** בדיוק כמו `businessSettings/{businessId}` (הפער שכבר זוהה),
המסמכים ב-`users` מזוהים **רק לפי מזהה המסמך עצמו** (`uid`) - אין
שדה `businessId` בתוך המסמך. כלל Firestore Rules גנרי מהצורה
`allow read, write: if resource.data.businessId == request.auth.uid`
(הדפוס שכנראה קיים לשאר ה-collections) **לא יתאים** ל-`users` בכלל,
כי אין שם שדה כזה לבדוק. צריך כלל ייעודי מהצורה:
`match /users/{userId} { allow read, write: if request.auth.uid == userId; }`.

**למה זה משנה:** אם הכלל הגנרי לא קיים ספציפית עבור `users`, ברירת
המחדל של Firestore (deny-by-default) אולי כבר חוסמת גישה - צריך
לוודא בפועל בקונסולת Firebase. הסיכון ההפוך (חמור יותר): אם מישהו
כבר כתב כלל **רחב מדי** בעבר כדי "לפתור" את הבעיה (למשל
`allow read, write: if request.auth != null`), **כל עסק יכול לקרוא/
לכתוב את מסמך `users` של עסק אחר** (פרטי עסק, שם, טלפון, `role`).
לבדוק את הכלל בפועל בקונסולה.

**גם:** `businessSettings/{businessId}` (`src/pages/Calculators/Calculators.tsx:326`,
`347`; `src/components/orders/NewOrderWizard.tsx:107`;
`src/components/orders/RepairOrderForm.tsx:55`) - אותו דפוס בדיוק,
כבר ידוע.

**collections שכן בטוחים** (יש להם שדה `businessId` בתוך המסמך,
בנוסף לפילטור בקריאה): `appointments`, `bulkItems`, `clients`,
`expenses`, `hairItems`, `orders` - כל כתיבה שנבדקה (ראו סעיף 2)
כוללת את השדה כראוי.

---

### 2. וולידציה חסרה: `NewOrderWizard.tsx` מאפשרת להזמין יותר ממה שיש במלאי

**איפה:** `src/components/orders/NewOrderWizard.tsx:182-192`
(`handleAddUsedBulkItem`) ו-`287` (`handleFinish`).

**הבעיה:** `handleAddUsedBulkItem` מוסיפה פריט מלאי פשוט להזמנה
בלי לבדוק שהכמות המבוקשת (`bulkItemPickerQty`) לא עולה על
`item.quantity` הזמין - אפשר גם להוסיף את **אותו** פריט כמה פעמים
ברצף ולצבור כמות שחורגת מהמלאי בלי שום אזהרה. בסיום ההזמנה (שורה
287): `Math.max(0, (catalogItem?.quantity ?? used.quantity) -
used.quantity)` - אם הכמות שנוצלה עולה על המלאי, זה **פשוט קובע 0**
בשקט, בלי הודעת שגיאה למשתמשת ובלי לעצור את יצירת ההזמנה. המלאי
בפועל "נעלם" (יורד ל-0 גם אם השתמשו בהרבה יותר משהיה), וההזמנה
עצמה נוצרת בהצלחה כאילו הכל תקין.

**למה זה משנה:** נתוני מלאי לא אמינים לאורך זמן - אי אפשר לדעת אם
"0 במלאי" אומר "באמת נגמר" או "מישהי הזמינה יותר ממה שהיה ונתקענו
ב-0". אין שום עצירה/אזהרה בזמן אמת כמו שיש בשלושה המקומות המקבילים
האחרים באתר שכן עושים את זה נכון:
- `src/components/orders/AssignHairModal.tsx:94,103,281` (`gramsExceedsStock`)
- `src/pages/Inventory/QuickRetailSaleModal.tsx:62-63`
- `src/components/orders/OrderDetailsPanel.tsx:85,303` (`bulkQtyExceedsStock`)

זה בדיוק אותו דפוס - קל להעתיק משם ל-`NewOrderWizard.tsx`.

---

### 3. ✅ נבדק ותקין - אין עוד פערי `businessId` בכתיבה

עברתי על **כל** קריאות `addDoc`/`setDoc` בפרויקט (11 סה"כ, לא כולל
`updateDoc` על מסמכים קיימים שלא צריכים את זה מחדש) - כולן כוללות
`businessId` כנדרש: `App.tsx` (users, ברישום), `AddClientModal.tsx`
(clients), `Expenses.tsx` (expenses), `Calendar.tsx` (appointments,
clients), `Inventory.tsx` (expenses, hairItems ×2, bulkItems),
`orderCreation.ts` (orders), `Calculators.tsx` (businessSettings -
לפי מזהה מסמך, ראו סעיף 1).

### 4. ✅ נבדק ותקין - אין שאריות קוד מהמעברים הקודמים

`grep` גלובלי אחרי `assignedOrderId`, `status: 'reserved'`/`"reserved"`
- **0 תוצאות** בכל הפרויקט. גם `WigOrder.hairCost`/`netCost`/
`skinTopCost`/`extraCosts` - לא קיימים בפועל (הוסרו כמתועד). ה-`hairCost`
שכן מופיע במקומות שונים (`Calculators.tsx`, `RepairOrderForm.tsx`,
`hairCost.ts`) הוא תמיד משתנה מקומי מחושב, לא שדה שמור ב-Firestore -
לא שארית, אבל ראו סעיף 6 (כפילות נוסחה).

---

## 🟠 חשוב - עקביות קוד ונתונים

### 5. טיפוסים מתים/שגויים ב-`src/types/index.ts` - סיכון לבלבול עתידי

**איפה:** `src/types/index.ts` - `Payment` (שורה 43), `ClientDocument`
(54), `WigOrder` (95), `Client` (110).

**הבעיה:** בדקתי import-ים בכל הפרויקט - **אף אחד** מארבעת הטיפוסים
האלה לא מיובא/בשימוש בשום מקום מחוץ לקובץ עצמו. חמור מזה, שניים מהם
**שגויים ביחס למבנה הנתונים האמיתי**:

- `WigOrder.status` מוגדר כ-`'in_production' | 'ready' | 'delivered'`
  - אבל ה-`orders` האמיתיים (`Sales.tsx` `Order`, `orderCreation.ts`)
  משתמשים ב-`"new" | "in_progress" | "styling" | "ready" | "delivered"`.
  ערך כמו `"new"` (הסטטוס שכל הזמנה חדשה מקבלת בפועל) **לא קיים בכלל**
  בטיפוס `WigOrder`. גם `isShowroom: boolean` (שורה 98) לא קיים בשום
  מסמך אמיתי - ה-orders האמיתיים משתמשים ב-`orderType` (מחרוזת תווית).
- `Client.measurements` מוגדר כ-**אובייקט** (`{circumference,
  earToEar, frontToNape}`) - אבל ה-`Client` האמיתי (`src/pages/Clients/Clients.tsx:10-17`,
  זה שבפועל בשימוש בכל האתר) מגדיר `measurements?: string` - **מחרוזת
  חופשית**, סוג נתונים אחר לגמרי.

**למה זה משנה:** אם מישהו (אנושי או Claude Code בעתיד) ייבא בטעות
`WigOrder`/`Client` מ-`types/index.ts` בחושבו שזה "המקור הרשמי", כל
קוד שייכתב נגד הטיפוס הזה יהיה שבור מול הנתונים האמיתיים. מומלץ
למחוק את שני הטיפוסים (ואת `Payment`/`ClientDocument` הלא-בשימוש)
או לתקן אותם שיתאימו בדיוק למבנה האמיתי ולייבא אותם בפועל בכל מקום
שמגדיר היום גרסה מקומית משלו.

**טיפוסי `Client` בפועל בפרויקט (3 הגדרות נפרדות):**
1. `src/pages/Clients/Clients.tsx:10` - **המקור האמיתי**, תואם למבנה
   ב-Firestore, בשימוש בפועל.
2. `src/pages/Calendar/Calendar.tsx:28` - תת-קבוצה מכוונת ומתועדת
   (`// טיפוס הלקוחה תואם בדיוק למבנה האמיתי... ראו Clients.tsx`) -
   זה **לא** בעיה, זו החלטת עיצוב מכוונת שכבר מתועדת נכון בהערה.
3. `src/types/index.ts:110` - שגוי ולא בשימוש, ראו למעלה.

### 6. נוסחת עלות שיער עדיין כפולה ב-`Calculators.tsx` (RepairsCalculator)

**איפה:** `src/pages/Calculators/Calculators.tsx:271-278` (הפונקציה
`RepairsCalculator`) מול `src/utils/hairCost.ts:50-54`
(`calculateHairCostFromGrams`).

**הבעיה:** השורות ב-`Calculators.tsx`:
```ts
const waste    = g * 0.3;
const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * (g + waste) / 1000;
```
הן **עותק מדויק, זהה לחלוטין**, של מה ש-`calculateHairCostFromGrams`
כבר עושה ב-`hairCost.ts`. **חשוב לציין**: `src/components/orders/RepairOrderForm.tsx:66`
(טופס התיקון בפועל בתוך תהליך ההזמנה) **כבר** מייבא ומשתמש ב-
`calculateHairCostFromGrams` - כלומר התיקון בוצע שם, אבל **לא** במחשבון
העצמאי בדף המחשבונים (`Calculators.tsx`). אם ערך ברירת המחדל של הבלאי
(30%) ישתנה אי פעם, צריך לזכור לעדכן גם כאן בנפרד - סיכון קלאסי
לאי-סנכרון.

**תיקון מוצע** (לא בוצע): להחליף את שלוש השורות ב-`Calculators.tsx`
בקריאה ל-`calculateHairCostFromGrams(g, settings)`, בדיוק כמו ב-
`RepairOrderForm.tsx`.

### 7. שם פונקציה מטעה: `createOrderWithProductionExpense`

**איפה:** `src/utils/orderCreation.ts:44`.

**הבעיה:** לפי ההערה בראש הקובץ עצמו (שורות 6-12), יצירת הוצאת-ייצור
אוטומטית **בוטלה** (יצרה כפילות פיננסית מול הוצאת הרכישה המקורית) -
אבל שם הפונקציה עדיין `createOrderWithProductionExpense`, כאילו היא
עדיין יוצרת הוצאה. כל מי שקורא רק את שם הפונקציה (בלי לפתוח ולקרוא
את ההערה) עלול להניח בטעות שיש כאן יצירת הוצאה כפולה. שינוי שם קטן
(`createOrder`?) יסגור את הפער בין השם להתנהגות בפועל.

### 8. חוסר עקביות בטעינה/שגיאות - כמעט כל הדפים "נכשלים בשקט"

**איפה:** בדקתי את כל 8 הדפים הראשיים. **רק** `src/pages/Clients/Clients.tsx`
(שורות 23, 36, 49, 54) מנהל state אמיתי של `loading`/`error` עם UI
מתאים (spinner, הודעת שגיאה קריאה). בכל שאר הדפים - `Inventory.tsx`,
`Sales.tsx`, `Expenses.tsx`, `Calendar.tsx`, `Dashboard.tsx`,
`Reports.tsx`, `Calculators.tsx` - שגיאת `onSnapshot`/`getDoc` הולכת
**רק** ל-`console.error`, בלי שום אינדיקציה למשתמשת בממשק.

**למה זה משנה:** אם יש בעיית רשת/הרשאות זמנית, המשתמשת (לא-טכנית)
תראה מסך ריק או ישן בלי שום הסבר, בלי לדעת שמשהו נכשל. `Clients.tsx`
כבר מדגים את הפתרון הנכון - קל להעתיק את הדפוס לשאר הדפים.

### 9. תבנית `react-hooks/set-state-in-effect` חוזרת ~14 פעמים

**איפה:** לפי `npm run lint` נכון להיום - 14 מופעים (התנודה קטנה בין
ריצות, תלוי אילו קבצים קיימים ברגע נתון). כולם אותו דפוס בדיוק:
`useEffect` שמאפס/מסנכרן state מקומי כשprop/ערך חיצוני משתנה (למשל
איפוס טופס בפתיחת מודל). זה כבר הדפוס המקובל בפרויקט כרגע (כולל
ברכיבים חדשים כמו `DateInput.tsx`/`TimeInput.tsx`/`Settings.tsx`
שנוספו לאחרונה, שנשארו עקביים איתו במכוון).

**למה זה משנה:** זה **לא** באג בפועל - זו אזהרת style ש-ESLint
מעלה כי יש דרכים "טהורות" יותר ב-React (`key` prop לאיפוס קומפוננטה,
לדוגמה). לא דחוף, אבל שווה החלטה מודעת אחת: להשאיר את הדפוס הזה
כמוסכמה מקובלת בפרויקט (ולשקול `eslint-disable` ממוקד או הרחבת
ה-config כדי שהאזהרה תפסיק "להרעיש"), או לתקן גורף בסבב נפרד.

### 10. עיצוב תאריך לתצוגה - עדיין לא אחיד (בנפרד מקלט התאריך, שכבר תוקן)

**איפה:** `src/pages/Calendar/Calendar.tsx:115-119` (`formatDateToIL`,
פונקציה מקומית ידנית) מול `toLocaleDateString("he-IL", ...)` ב-
`src/pages/Dashboard/Dashboard.tsx:56,148`, `src/pages/Reports/Reports.tsx:99`,
`src/pages/Inventory/RemnantMergeLogModal.tsx:56`.

**הבעיה:** זה **לא** אותה בעיה כמו קלט התאריך (`DateInput`/`TimeInput`
כבר מטפלים בקלט בכל מקום - וידאתי ב-`grep` שאין יותר אף
`type="date"`/`type="time"` בפרויקט). זו סוגיה נפרדת ועדינה יותר:
**תצוגת** תאריך (לא קלט) עדיין משתמשת בשתי גישות שונות - פונקציה
ידנית עצמאית ב-`Calendar.tsx` מול `toLocaleDateString("he-IL")`
בשאר הדפים. שתיהן בדרך כלל מציגות תוצאה דומה ל-`he-IL`, אבל
`toLocaleDateString` בלי אפשרויות מפורשות עדיין תלוי-implementation
של הדפדפן באופן עקרוני - אותה משפחת סיכון (תלות בסביבה) כמו הבעיה
המקורית עם קלט התאריך, רק בעוצמה נמוכה יותר. הצעה: פונקציית `formatDateIL`
משותפת אחת ב-`src/components/common/` (או ליד `DateInput.tsx`) שכל
מקום שמציג תאריך יקרא לה, במקום `toLocaleDateString` ישיר או מימוש
עצמאי כמו ב-`Calendar.tsx`.

---

## 🟡 נחמד שיהיה - פערים פונקציונליים וביצועים

### 11. `Settings.tsx` - עדיין placeholder ברובו

**איפה:** `src/pages/Settings/Settings.tsx:86-87`.

הכרטיס הראשון בדף מכיל תוכן placeholder ממש: *"כאן תוכל לנהל בהמשך
את הגדרות העסק, פרטי פרופיל, צבעי ממשק והגדרות חיבור..."* - אין
בפועל שום דרך לערוך שם פרטי עסק/פרופיל/העדפות. הפיצ'ר האמיתי היחיד
בדף כרגע הוא חיבור Google Calendar (שעובד היטב). חסר לגמרי: עריכת
פרטי עסק (שם, טלפון, לוגו), ניהול קטגוריות הוצאות/סוגי פגישות (כרגע
מקודדים כ-`<option>` קבועים בכל מקום שמשתמש בהם - למשל
`Expenses.tsx`, `Calendar.tsx`), גיבוי/ייצוא נתונים.

### 12. התראות מלאי נמוך - קיימות, אבל פסיביות בלבד

**איפה:** `minThreshold` (הוגדר ב-`src/types/index.ts:37`) בשימוש
אמיתי ב-3 מקומות: `src/pages/Inventory/Inventory.tsx:510` (תג "מלאי
נמוך" בטבלה), `src/pages/Dashboard/Dashboard.tsx:173` (מוצג ב"מרכז
התראות"), `src/pages/Reports/Reports.tsx:120` (אחוז זמינות מלאי).

**המצב בפועל:** זה **לא** שדה מת - יש שימוש אמיתי. אבל ההתראה היחידה
היא **פסיבית**: המשתמשת חייבת להיכנס בעצמה ל-Dashboard כדי לראות
שמשהו נגמר. אין שום ערוץ יזום (מייל, התראת דפדפן/push, סימון בסיידבר)
שיודיע כשמלאי יורד מתחת לסף בלי שהיא תבדוק ידנית.

### 13. `Reports.tsx` - מחובר לדאטה אמיתי, אבל בסיסי יחסית

**איפה:** `src/pages/Reports/Reports.tsx`.

**המצב בפועל:** בניגוד לחשד אפשרי - **כן** מחובר לדאטה אמיתי דרך
`onSnapshot` על `orders`/`expenses`/`bulkItems` (לא נתונים מדומים).
מחשב הכנסות/רווח/הזמנה ממוצעת/% לקוחות חוזרות, טבלת 6 חודשים
אחרונים, ואחוז זמינות מלאי - כל זה אמיתי ועובד. **מה שחסר** ביחס
למערכת ניהול עסק בוגרת: טווח תאריכים לבחירה (כרגע קבוע - שנה נוכחית
מול קודמת, 6 חודשים אחרונים בלבד, לא ניתן לשינוי), שום אפשרות ייצוא
(Excel/PDF/CSV), ופילוח נוסף (למשל לפי סוג עבודה לאורך זמן, לא רק
"שירות מוביל" חודשי בודד).

### 14. חיפוש/סינון - קיים ברוב המקומות ההגיוניים, חסר בעיקר ביומן

**איפה:** יש חיפוש אמיתי ב-`Clients.tsx`, `Inventory.tsx`, `Sales.tsx`,
`Expenses.tsx`. **אין** ב-`Calendar.tsx` (יש ניווט לפי תאריך, אבל אין
דרך לחפש "כל הפגישות של לקוחה X" בלי לדפדף ידנית בין שבועות), וגם לא
ב-`Reports.tsx`/`Calculators.tsx` (סביר שלא צריך שם).

### 15. ביצועים: אין שום `limit()` בשאילתאות - כל collection נטען במלואו

**איפה:** 14 קריאות `onSnapshot` בפרויקט, **אפס** שימושים ב-`limit()`
של Firestore בכל הפרויקט. כל מסך שמאזין ל-`appointments`/`orders`/
`expenses` טוען את **כל ההיסטוריה** של העסק בכל פעם, בלי הגבלה
ובלי pagination.

**למה זה משנה:** לא דחוף כרגע (עסק קטן-בינוני, נפח נתונים סביר) -
אבל זו עלות/ביצועים שיחמירו עם הזמן ככל שההיסטוריה גדלה (יותר קריאות
Firestore בכל טעינת עמוד = יותר עלות, יותר זמן טעינה). כדאי לשקול
`limit()`/pagination בעיקר ל-`orders`/`appointments`/`expenses`
כשהנפח יגדל משמעותית.

### 16. תבנית N+1 קלה ב-`NewOrderWizard.tsx` (לא דחוף בנפח נוכחי)

**איפה:** `src/components/orders/NewOrderWizard.tsx:284-290` -
`Promise.all` שמריץ `updateDoc` נפרד לכל פריט ייחודי ב-`usedBulkItems`
בסיום הזמנה. מקבילי (לא רציף), אז לא "איטי" באמת, אבל עדיין N כתיבות
נפרדות לכל הזמנה. בנפח שימוש טיפוסי (2-5 סוגי פריטים בהזמנה) זה לא
משמעותי בפועל - מצוין כאן להשלמת התמונה, לא כבעיה דחופה.

---

## 📄 תיעוד - `CLAUDE.md` דורש עדכון משמעותי

`CLAUDE.md` הנוכחי לא כולל (נבנו/נוספו מאז שנכתב לאחרונה):

- **`functions/` - קודבייס Cloud Functions נפרד לגמרי** (סנכרון
  Google Calendar: OAuth callback, 3 טריגרי Firestore, פונקציית
  סנכרון היסטורי, secrets ב-Secret Manager). זו תוספת ארכיטקטונית
  משמעותית - קודבייס Node/TypeScript נפרד לגמרי מה-SPA, עם `firebase.json`/
  `.firebaserc` חדשים בשורש הריפו שלא היו קיימים קודם.
- **קונבנציית אייקונים**: `lucide-react` הוא ספריית האייקונים
  הרשמית באתר כרגע (הוחלף מאימוג'ים ברוב הדפים) - לא מוזכר בכלל.
- **`@twemoji/api`**: אימוג'ים שכן נשארים בקוד (חלק מהמקומות עדיין
  לא הומרו ל-lucide) מוצגים כתמונות SVG קבועות דרך סריקה גלובלית
  ב-`App.tsx`, לא כתווי טקסט - לא מוזכר, ויש הסתייגות טכנית ידועה
  (ראו `summary.md` הקודם) שכדאי שתהיה מתועדת קבוע איפשהו נגיש.
- **רכיבי קלט משותפים חדשים**: `DateInput.tsx`, `TimeInput.tsx`,
  `CustomSelect.tsx` תחת `src/components/common/` - כולם עצמאיים
  (לא native `<input type=date/time>`/`<select>`), עם לוגיקת מיקום
  מבוססת `getBoundingClientRect()` + portal. זו כבר תשתית UI סטנדרטית
  שכל תאריך/שעה/select חדש אמור להשתמש בה - שווה שורה מפורשת ב-CLAUDE.md.
- **`businessSettings` collection** - חסר לגמרי מרשימת ה-collections
  שמתועדת ("Firestore collections in use").
- **פיצ'רי Inventory שנוספו**: קופסאות שאריות (`isRemnantBox`,
  מיזוג/ביטול מיזוג עם יומן), מוצרים קמעונאיים עם מכירה מהירה
  (`QuickRetailSaleModal`) - לא מוזכרים.
- **`src/utils/hairCost.ts` ו-`src/utils/orderProfit.ts`** - שני
  utils משותפים מרכזיים שנוספו (מקור אמת יחיד לנוסחת עלות שיער
  ולחישוב רווח הזמנה) - לא מוזכרים כלל, כדאי שיהיו כי "Firestore
  access is inline in components" (כפי שכתוב היום ב-CLAUDE.md) כבר
  לא מדויק ל-100% - יש שכבת utils משותפת אמיתית עכשיו, גם אם היא
  לא ניגשת ל-Firestore ישירות.
