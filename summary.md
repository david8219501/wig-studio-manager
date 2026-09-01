# סיכום: 5 תיקונים/שינויים לטפסי הזמנה

## 1. "קלאסי" חסר בשדה מבנה - נבדק, לא נמצא באג בקוד הנוכחי

חיפוש יסודי בכל הפרויקט: `STRUCTURE_OPTIONS` (`hairCost.ts`,
`["טופ","סקין","קלאסי","סרט"]`) מיובא ומוצג ישירות (`.map(...)`, בלי
פילטור/חיתוך) בכל שלושת המקומות שמשתמשים בו - `NewOrderWizard.tsx`,
`Calculators.tsx`, `ShowroomStockFormModal.tsx`. אין מערך מקומי כפול
או לא-מסונכרן באף אחד מהם. `git log --follow` על `hairCost.ts` מראה
קומיט יחיד אי-פעם - "קלאסי" היה שם תמיד. **לא בוצע שינוי קוד** - סביר
שההבחנה המקורית התבססה על תצוגה ישנה/במטמון, או בלבול עם שדה "מלאות"
(ש-`FULLNESS_OPTIONS` שלו כולל גם הוא "קלאסי"). אם הבעיה עדיין נראית
בפועל בדפדפן - כדאי לרענן קשיח (Ctrl+Shift+R) ולבדוק שוב.

## 2. עיצוב כפתור "הוסף פריט מהמלאי"

תוקן בכל 3 המקומות: `NewOrderWizard.tsx`, `RepairOrderForm.tsx`,
`ShowroomStockDetailsPanel.tsx`. הוסר ה-"+" מהטקסט (נשאר "הוסף פריט"/
"הוסף פריט מהמלאי"), ו-`className` הפך תלוי-מצב: `btn-secondary`/
`showroom-details-btn-secondary` (אפור) כל עוד לא נבחר פריט,
`btn-primary`/`showroom-details-btn-primary` (סגול/accent) ברגע
שנבחר פריט מה-select (`bulkItemPickerId`/`selectedBulkCatalogItem`).

## 3. הסרת paymentsCount

שדה מת שלא נקרא בשום מקום (רק נכתב) - הוסר לגמרי: מ-`NewOrderInput`
(`orderCreation.ts`) וממה שנכתב בפועל ב-`createOrder`, מה-state/UI
("מספר תשלומים", 6 pills) ב-`NewOrderWizard.tsx`, ומכל שלוש נקודות
הקריאה הנוספות שהעבירו `paymentsCount: 1` בלי סיבה
(`QuickRetailSaleModal.tsx`, `RepairOrderForm.tsx`,
`ShowroomStockFormModal.tsx`). אומת עם grep גלובלי שאין אף התייחסות
שנותרה.

## 4. "פאת תצוגה" חוזרת לשלב 1 - מחוברת נכון למודל החדש

`NewOrderWizard.tsx`: נוספה כרטיסייה שלישית "פאת תצוגה" בשלב 1
(`orderType` הורחב ל-`"new"|"repair"|"showroom"|"other"`). בבחירתה,
שלב 2 מוחלף לגמרי (לא בחירת לקוחה - רשימת פאות תצוגה זמינות: orders
עם `isShowroomStock` וללא `clientId`, נטענות בפתיחה ומסוננות עם
`isUnsoldShowroomStock` המשותף מ-`orderCreation.ts` - אותו תנאי בדיוק
כמו בלשונית "פאות תצוגה" ב-`Inventory.tsx`). בחירת פאה + "הבא" יוצאת
מהאשף לגמרי (כמו "תיקון") וקוראת ל-prop חדש `onOpenSellShowroom(order)`.

`SellShowroomStockModal.tsx` קיבל `preselectedClient?` אופציונלי -
כשמועבר, מדלג על ה-dropdown של בחירת לקוחה (מציג שורת "לקוחה: X"
קבועה במקום), בדיוק כמו הדפוס הקיים ב-`NewOrderWizard.tsx`.

`ClientDrawer.tsx` (המקום היחיד שמרנדר את שני הרכיבים) מחבר ביניהם:
`onOpenSellShowroom` שומר את הפאה שנבחרה ב-state, וסוגר את
`NewOrderWizard`; מרנדר `SellShowroomStockModal` עם אותה פאה + אותו
`preselectedClient` שכבר מועבר גם ל-`NewOrderWizard` - הלקוחה עוברת
בין שני הרכיבים בלי לבקש שוב.

## 5. באג לחיצה כפולה מדלגת שלב - נחקר, לא נמצא קוד שגוי, נוסף הגנה

**מה נבדק:** `setStep`/`handleNext` נקראים אך ורק מ-onClick של כפתור
"הבא" עצמו (`grep` מאשר - אין נתיב קוד נוסף). נבדקו ונשללו: `<form>`/
`onSubmit` (אין בכלל בקובץ), מאזיני `click` גלובליים ב-`ClientDrawer.tsx`
(אין), הזזת layout ב-CSS כתוצאה מבחירת כרטיסייה (`.type-card.active`
משנה רק `border-color`/`background`, לא מידות - אין reflow), media
queries שיכולות לגרום להיסט תגובתי (אין ב-`NewOrderWizard.css`
בכלל), מאזיני `dblclick` בכל הפרויקט (אין אף אחד). **לא נמצא "עקבות
אצבע" ברמת קוד היישום** לנתיב קריאה חלופי ל-`handleNext`.

המסקנה הסבירה ביותר: כרטיסיית הבחירה וכפתור "הבא" נמצאים קרוב זה
לזה במודל קומפקטי, וכפתור "הבא" **תמיד מאופשר כבר משלב 1** (כי
`orderType` מתחיל עם ערך ברירת מחדל תקין - "new" - עוד לפני בחירה
מפורשת) - כך שלחיצה כפולה מהירה על הכרטיסייה (למשל הרגל הנפוצה
"ללחוץ שוב לאישור") עלולה, בתזמון/מיקום גבוליים, "לתפוס" גם את
"הבא" בלי כוונה אמיתית להתקדם.

**התיקון:** נוספה הגנת זמן (debounce guard) - `lastTypeSelectRef`
(חותמת זמן) מתעדכנת בכל בחירת סוג הזמנה (`handleTypeSelect`, מחליף
קריאה ישירה ל-`setOrderType`); `handleNext`, כשנקרא משלב 1, מתעלם
לגמרי אם עברו פחות מ-400ms מהבחירה האחרונה - זמן קצר מדי לייצג לחיצה
מודעת ונפרדת על "הבא". לחיצה אמיתית ומכוונת על "הבא" (שמגיעה תמיד
זמן רב יותר אחרי הבחירה) לא מושפעת.

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות בכל 8 הקבצים שנערכו; אומת
  עם `git diff`/בדיקת שורות שכל השגיאות הקיימות הן `react-hooks/set-state-in-effect`/
  `no-explicit-any` ישנות ולא קשורות.
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל - מומלץ לבדוק ידנית לפני
  סמיכה מלאה, בפרט את זרימת "פאת תצוגה" המלאה מקצה לקצה (סעיף 4)
  ואת האם הגנת ה-debounce (סעיף 5) אכן פותרת את הבעיה בפועל.
