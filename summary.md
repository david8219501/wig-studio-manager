# סיכום: עיצוב מחדש של דף מחשבונים (Calculators.tsx) - 3 שינויים

## קבוצה 1: סידור מחדש - הצעת מחיר + שדרוגים/תיקונים למעלה, זה ליד זה ✅ הושלמה

שינוי סדר בלבד ב-JSX (בלי לוגיקה) בתוך `calc-grid` (grid דו-עמודתי
קיים): הסדר הקודם היה Price → Catalog → Length → Repairs (כך ש-
Price ו-Repairs נפלו כל אחד בעמודה אחרת, לא סמוכים). הסדר החדש:
Price → Repairs → Length → Catalog - כך ש-"מחשבון הצעת מחיר לפאה"
ו-"מחשבון שדרוגים ותיקונים" יושבים זה ליד זה בשורה העליונה (עמודה
ימין/שמאל), ו-"מחשבון אורכים לבניית פאה" יורד לתחילת השורה שמתחת.

**קבצים:** `src/pages/Calculators/Calculators.tsx` (שינוי סדר JSX בלבד).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע, `Calculators.tsx` נקי.

## קבוצה 2: הסרת כרטיס "קטלוג מחירון - פאת טוף קלאסי" ✅ הושלמה

הוסרו לגמרי: רכיב `CatalogCard` (כולל טוגל "תצוגת מנהל/לקוחה" והכל),
הנתונים הסטטיים `CATALOG_PRICING` (12 שורות מחיר קבועות לפי אורך)
ו-`CATALOG_SPECS` (מחירי סקין/טופ/רשת קבועים), והשימוש בו ב-`calc-
grid`. הגריד נשאר עם 3 הכרטיסים בלבד (הצעת מחיר, שדרוגים/תיקונים,
אורכים) - התוצאה מתאימה בדיוק למה שקבוצה 1 ביקשה (הצעת מחיר+תיקונים
בשורה עליונה, אורכים בשורה שמתחת, בלי "חור" ריק בעמודה השנייה).

**החלטת CSS (לא הוזכרה במפורש בבקשה):** הוסרו רק המחלקות הספציפיות
לכרטיס הישן שהוסר (`.catalog-card`, `.catalog-sub-badge`,
`.catalog-profit`) - אבל **נשארו** המחלקות הגנריות לטבלת מחירים
(`.catalog-table-wrapper`, `.catalog-table`, `.catalog-price`),
כי קבוצה 3 (טאב קטלוגי המחירים הדינמי) צריכה בדיוק את אותה סטיילינג
טבלה - עקבי עם הדפוס שכבר הוקם היום ב-Reports.tsx (שימוש חוזר
ב-`.chart-wrapper` הגלובלי) במקום כפילות CSS.

**קבצים:** `src/pages/Calculators/Calculators.tsx`,
`src/pages/Calculators/Calculators.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין, `Calculators.tsx` נקי.

## קבוצה 3: יצירת קטלוגי מחירים - טאב נוסף ✅ הושלמה

**החלטת פרשנות (לא הייתה בבקשה מפורש):** הבקשה כינתה את הפיצ'ר "טאב
שלישי", אבל בדף המחשבונים לא היו טאבים בכלל קודם (רק grid קבוע של
כרטיסים) - אז מומש כ-2 טאבים חדשים: "מחשבונים" (התוכן הקיים, ברירת
מחדל) ו-"קטלוגי מחירים" (החדש), עם מתג טאבים סטנדרטי. נעשה שימוש
חוזר במחלקות `.tab-switch`/`.tab-btn` הגלובליות (מקור: `Inventory.css`
- כל ה-CSS מתאגד לחבילה אחת), בלי להגדיר מחדש.

**יצירת קטלוג חדש:** טופס עם שם חופשי, מבנה (`STRUCTURE_OPTIONS`)
ומלאות (`FULLNESS_OPTIONS`). בשמירה מחושבות שורות לכל 15 האורכים
ב-`HAIR_LENGTH_OPTIONS` (5-75 בקפיצות 5) - `computeCatalogRows`
פונקציה חדשה שקוראת ל-`calculateHairCost({length, structure,
fullness}, settings)` לכל אורך, ומחשבת `cost` (עלות שיער גולמית -
`hairCost`, בלי סקין/טופ/רשת/נוספות, בשונה מ-PriceCalculator) ו-
`suggestedPrice = cost * (1 + profitMargin/100)` - אותה נוסחה בדיוק
כמו `suggestedPrice` ב-`RepairOrderForm.tsx`. נשמר ל-collection חדש
`priceCatalogs`: `businessId`, `name`, `structure`, `fullness`,
`createdAt` (ISO, כמו `AddHairModal.tsx`/`CreateRemnantBoxModal.tsx`),
`rows: [{length, cost, suggestedPrice}]`.

**קיפאון מכוון:** הקטלוג נשמר כתמונת מצב - שינוי מאוחר יותר בהגדרות
התמחור לא נוגע בקטלוגים קיימים, בדיוק כמבוקש.

**רשימת קטלוגים:** כל קטלוג מוצג בכרטיס עם שם, תאריך יצירה
(`formatDateIL`), וטבלת מחירים (אורך/עלות/מחיר מוצע, בעיצוב
`.catalog-table`/`.catalog-table-wrapper`/`.catalog-price` שנשארו
מכוונה מקבוצה 2). כפתור **"עדכן לפי הגדרות נוכחיות"** מחשב מחדש את
`rows` עם ה-`settings` הנוכחיים ומעדכן את אותו מסמך (`updateDoc`,
לא `addDoc`). כפתור **עריכה** (שם/מבנה/מלאות) עם שמירה/ביטול inline.
כפתור **מחיקה** עם `ConfirmDialog` (`variant="danger"`), אותו דפוס
בדיוק כמו מחיקת פריט מלאי פשוט ב-`Inventory.tsx`.

**החלטה:** שמירת עריכה (שם/מבנה/מלאות) מחשבת מחדש את `rows` גם היא
(לא רק כפתור "עדכן") - כי שינוי מבנה/מלאות בלי לעדכן את שורות
המחיר הקפואות היה משאיר קטלוג לא-עקבי (rows לא תואמים למבנה/מלאות
המוצגים).

**קבצים:** `src/pages/Calculators/Calculators.tsx` (טיפוסים
`CatalogRow`/`PriceCatalog`, `computeCatalogRows`, רכיב
`PriceCatalogsTab`, `MiniText`, מתג טאבים), `src/pages/Calculators/
Calculators.css` (`.price-catalog-*`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין (2 האזהרות הקיימות ב-`Calculators.tsx` על `useMemo` של
`PriceCalculator`/`RepairsCalculator` זזו שורה בגלל ה-imports
החדשים, אבל הן קיימות מראש ולא נוצרו כתוצאה מהשינוי הזה - 0 בעיות
חדשות). Firestore Rules: `priceCatalogs` עוקב אחרי דפוס `businessId`
כשדה בתוך המסמך (לא כ-ID) בדיוק כמו `hairItems`/`bulkItems`/
`expenses` - מכוסה על ידי הכלל הגנרי הקיים, לא נדרש עדכון Rules.
