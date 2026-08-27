# סיכום פיצ'ר: מעקב עלות אמיתית להזמנה

מטרת הפיצ'ר: כל הזמנה מחשבת רווח בפועל = מחיר שנגבה מהלקוחה פחות עלות אמיתית
מהמלאי (פריטי מלאי פשוט + עלות שיער, גולמית או בפועל) — לא רק "מה שגבינו".

הפיצ'ר בוצע ב-4 שלבים: (1) חילוץ נוסחת עלות השיער למקום משותף, (2) types +
NewOrderWizard (usedBulkItems + אומדן שיער אוטומטי), (3) מודל שיוך שיער בפועל,
(4) הצגת רווח מחושב בטבלת Sales. כל השלבים בוצעו ונבדקו (`tsc -b --noEmit`,
`eslint`, `vite build`) ללא שגיאות חדשות.

---

## קבצים חדשים

### `src/utils/hairCost.ts`
מקור האמת היחיד לנוסחת עלות השיער הגולמית (בלי רווח/מרג'ין), נלקח מ-
`Calculators.tsx` בלי שינוי בלוגיקה:

- `HAIR_LENGTH_OPTIONS` — מערך האורכים הסגור (5–75 בקפיצות של 5).
- `STRUCTURE_OPTIONS` — `["טופ","סקין","קלאסי","סרט"]`.
- `FULLNESS_OPTIONS` — `["דליל","קלאסי","מלא"]`.
- `HairCostSettings` — ממשק `{ pricePerKgUsd, exchangeRate }`.
- `lookupBaseWeight(length)` — משקל בסיס לפי טבלת `BASE_WEIGHTS`.
- `calculateHairCost(input: {length, structure, fullness}, settings)` —
  מחזיר `{ netGrams, waste, hairCost }` (בלאי 30%, עלות = מחיר לק"ג × שער ×
  (משקל נטו + בלאי) / 1000).

### `src/utils/orderProfit.ts`
פונקציה משותפת לחישוב הרווח בפועל, כדי שהנוסחה תהיה זהה בכל מקום שמציג
אותה (כרגע רק טבלת Sales, אבל בנויה לשימוש חוזר):

- `ProfitableOrder` — ממשק מינימלי `{ totalPrice, usedBulkItems?, hairCostEstimated?, hairCostActual? }`.
- `calculateOrderProfit(order)` — `totalPrice − Σ(unitCostAtTime × quantity) על usedBulkItems − (hairCostActual ?? hairCostEstimated ?? 0)`.

**החלטה שלי, לא הייתה בתוכנית המקורית במפורש:** הפכתי את נוסחת הרווח
לקובץ util נפרד במקום לכתוב אותה inline בתוך `Sales.tsx`, כדי שכל מסך עתידי
שירצה להציג רווח (למשל כרטיס הזמנה עתידי) ישתמש באותה פונקציה בדיוק.

### `src/components/orders/AssignHairModal.tsx` + `AssignHairModal.css`
מודל "שיוך שיער בפועל" (שלב ב' מהתוכנית):

- Props: `{ isOpen, order: AssignableOrder | null, onClose }`.
- `AssignableOrder` — ממשק מינימלי `{ id, clientName, hairItemId?, hairGramsUsed?, hairCostActual? }` (השדות אופציונליים כדי להתאים לטיפוס `Order` הקיים ב-`Sales.tsx`).
- **מצב "לא משויך"**: טוען את כל `hairItems` של העסק, מסנן ל-`status === 'available'`, מאפשר חיפוש לפי מזהה/גוון, בחירת קוקו + הזנת גרמים, ותצוגת תחזית חיה של העלות (`costPrice × gramsUsed / initialWeight`). בשמירה (`handleSave`):
  1. `updateDoc` על `hairItems/{id}`: `currentWeight` מופחת, `status: 'reserved'`, `assignedOrderId: order.id`.
  2. `updateDoc` על `orders/{id}`: `hairItemId`, `hairGramsUsed`, `hairCostActual`.
- **מצב "משויך"**: מציג סיכום (קוקו, גוון/אורך, גרמים, עלות בפועל) עם כפתור **"בטל שיוך"** (`handleUnassign`) — פעולה שלא צוינה במפורש בתוכנית המקורית, הוספתי אותה כהשלמה טבעית של הזרימה: מחזירה את המשקל ל-`hairItems` (`currentWeight + hairGramsUsed`), מחזירה `status: 'available'`, מוחקת את `assignedOrderId` (`deleteField()`), ומאפסת את שלושת השדות בהזמנה ל-`null`.
- **החלטה שלי:** בחרתי לקבוע `status: 'reserved'` + `assignedOrderId` על הקוקו בזמן השיוך, למרות שהתוכנית המקורית דיברה רק על הורדת משקל וחישוב עלות. עשיתי את זה כי שדה `assignedOrderId` וסטטוס `'reserved'` כבר קיימים בטיפוס `HairItem` ובתצוגה של `Inventory.tsx` (שכבר יודע להציג "משויך להזמנה #X") — כך השיוך "בפועל" מקבל ייצוג עקבי גם במסך המלאי, בלי לשנות את `Inventory.tsx` עצמו.
- **CSS עצמאי לחלוטין** (לא תלוי ב-`NewOrderWizard.css`): גיליתי ש-`Sales.tsx` (שם המודל נפתח) לא מייבא בכלל את `NewOrderWizard.css` — הוא נטען רק דרך `ClientDrawer.tsx`. מאחר ו-CSS בפרויקט הזה גלובלי (בלי CSS Modules), הסתמכות על מחלקות כמו `.field`, `.btn-primary` מקובץ אחר הייתה שוברת עיצוב בשקט. לכן שכפלתי בתוך `AssignHairModal.css` (עם selector מקדים `.assign-hair-card`) את מחלקות `.field`, `.font-bold`, `.hair-cost-hint`, `.btn-primary`, `.btn-secondary` הנדרשות, כדי שהקובץ יעמוד בזכות עצמו.

---

## קבצים שעודכנו

### `src/types/index.ts`
- נוסף ממשק חדש `UsedBulkItem`: `{ itemId, itemName, quantity, unitCostAtTime }`.
- `WigOrder` עודכן: נוספו `usedBulkItems: UsedBulkItem[]`, `hairItemId: string | null`, `hairGramsUsed: number | null`, `hairCostEstimated: number`, `hairCostActual: number | null`.
- **סטייה מהתוכנית / החלטה שלי:** הסרתי מ-`WigOrder` את השדות הישנים `hairCost`, `netCost`, `skinTopCost`, `extraCosts` — הם לא היו בשימוש בפועל באף מקום בקוד (הטיפוס `WigOrder` היה בכלל מנותק מהמסמכים האמיתיים שנכתבים ל-Firestore על ידי `NewOrderWizard.tsx`, שכותב אובייקט אד-הוק). זו לא הייתה בקשה מפורשת, אבל השארת שדות מתות לצד השדות החדשים הייתה יוצרת בלבול.

### `src/pages/Calculators/Calculators.tsx`
- ייבוא חדש: `HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost` מ-`../../utils/hairCost`.
- הוסרו לגמרי מהקובץ: `BASE_WEIGHTS`, `STRUCTURE_MOD`, `FULLNESS_MOD`, הפונקציה `lookupWeight` — הועברו ל-`hairCost.ts`.
- `PriceCalculator`: ה-`useMemo` שמחשב את התוצאה קורא עכשיו ל-`calculateHairCost({length, structure, fullness}, settings)` במקום החישוב המקומי; רשימות האפשרויות ל-`MiniSelect` (אורך/מבנה/מלאות) מגיעות מהקבועים המיובאים במקום מערכים מקודדים inline.
- **ללא שינוי בתוצאה שרואה המשתמש** — בדקתי עם `tsc`/`build` שאין שינוי התנהגותי.
- **לא נגעתי** ב-`RepairsCalculator` (מחשבון שדרוגים/תיקונים) — הוא מחשב עלות שיער ישירות מגרמים (לא מאורך), כך שהוא מחוץ להיקף שהוגדר במפורש ("אורך מרשימה סגורה, מבנה, מלאות"). יש שם עדיין נוסחת `hairCost` כפולה (לא רפקטרתי אותה) — ראה "מה נשאר" למטה.

### `src/components/orders/NewOrderWizard.tsx`
- ייבואים חדשים: `doc, getDoc, updateDoc` מ-`firebase/firestore`; `BulkItem, UsedBulkItem` מ-`../../types`; `HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost, HairCostSettings` מ-`../../utils/hairCost`.
- **State חדש:**
  - `hairLength`, `hairStructure`, `hairFullness` — שלוש הבחירות הסגורות לאומדן שיער.
  - `hairCostSettings` — נטען מ-`businessSettings/{businessId}` בפתיחת האשף (אותו מסמך שמשמש את דף המחשבונים).
  - `bulkItemsCatalog` — כל `bulkItems` של העסק, נטען בפתיחת האשף.
  - `usedBulkItems` — הרשימה המצטברת של פריטים שנוספו להזמנה.
  - `bulkItemPickerId`, `bulkItemPickerQty` — שדות הבחירה הזמנית להוספת פריט.
- **הוסר:** ה-state הישן `length`/`setLength` (שדה טקסט חופשי לאורך) — הוחלף בשלוש הבחירות הסגורות.
- **פונקציות חדשות:**
  - `hairCostEstimated` (`useMemo`) — מחשב `calculateHairCost(...).hairCost` רק אם שלושת השדות מלאים, אחרת `0`.
  - `handleAddUsedBulkItem` — מוסיף רשומה ל-`usedBulkItems` (מזהה/שם/כמות/`unitCostAtTime` = המחיר הנוכחי של הפריט במלאי כרגע). ניתן ללחוץ שוב ושוב ולצרף אותו פריט כמה פעמים (לא ממוזג).
  - `handleRemoveUsedBulkItem` — מסיר רשומה מהרשימה לפי אינדקס (יכולת הסרה — לא צוינה במפורש בתוכנית, הוספתי לשימושיות בסיסית).
- **`handleFinish` עודכן:**
  - `specsSummary` כולל עכשיו את שורות האורך/מבנה/מלאות בנפרד (לפני זה היה שדה טקסט חופשי אחד).
  - ה-`addDoc` ל-`orders` כולל את `usedBulkItems`, `hairItemId: null`, `hairGramsUsed: null`, `hairCostEstimated`, `hairCostActual: null`.
  - נוסף `Promise.all` שמריץ `updateDoc` על כל `bulkItems/{itemId}` שנעשה בו שימוש, ומוריד את הכמות (`Math.max(0, currentQty − usedQty)`), כנדרש בתוכנית ("בסיום ההזמנה, כל פריט ברשימה מוריד את הכמות שלו בפועל מ-bulkItems").
- **JSX בשלב 3:**
  - שדה "אורך (ס"מ)" הטקסטואלי הוחלף בשלוש בחירות `<select>` (אורך/מבנה/מלאות) בשורה בת 3 עמודות (`form-row form-row-3`), עם תצוגת "עלות שיער משוערת" חיה כשכל השדות מלאים.
  - נוסף בלוק "פריטי מלאי שנוספו להזמנה" — רשימת הפריטים שנבחרו (עם כפתור הסרה), ושורת הוספה (select מתוך `bulkItemsCatalog` + input כמות + כפתור "+ הוסף פריט מהמלאי").
  - שדה "גוון/צבע" נשאר כפי שהיה, רק הועבר לשורה נפרדת.
- **החלטה שלי:** קראתי לשדות החדשים `hairLength`/`hairStructure`/`hairFullness` ולא `length`/`structure`/`fullness` הפשוטים, כי ב-`NewOrderWizard` כבר קיים state בשם `texture` (משמש ל"תנועה" — ישר/גלי/מתולתל, שדה לא קשור) ו-`size` (מידת הפאה) — שמות שיכלו להתנגש מושגית עם `structure`/`fullness` של עלות השיער.
- **החלטה שלי (לא נדרשה מפורשות):** לא הפכתי את שלושת שדות עלות השיער לשדות חובה. אם המשתמשת משאירה אותם ריקים, ההזמנה נשמרת עם `hairCostEstimated: 0` והאשף ממשיך כרגיל (לא חוסם התקדמות). אם רוצים לאכוף מילוי — זה שינוי קטן ונוסף.

### `src/components/orders/NewOrderWizard.css`
- נוסף `.field select` (עד כה רק `.field input` היה מעוצב).
- נוסף `.form-row-3` (גריד 3 עמודות).
- נוספו `.hair-cost-hint`, `.bulk-item-list`, `.bulk-item-row`, `.bulk-item-remove-btn`, `.bulk-item-add-row` לתמיכה ב-UI החדש.

### `src/pages/Sales/Sales.tsx`
- ייבואים חדשים: `UsedBulkItem` מ-`../../types`, `AssignHairModal`, `calculateOrderProfit` מ-`../../utils/orderProfit`.
- ממשק `Order` (המוגדר מקומית בקובץ הזה, ומיוצא ונצרך גם על ידי `ClientDrawer.tsx`) הורחב עם: `usedBulkItems?`, `hairItemId?: string | null`, `hairGramsUsed?: number | null`, `hairCostEstimated?`, `hairCostActual?: number | null` — כל השדות אופציונליים כדי לא לשבור הזמנות ישנות שנוצרו לפני הפיצ'ר.
- State חדש: `assigningOrder: Order | null` — ההזמנה שעליה פתוח כרגע מודל שיוך השיער.
- `totalProfit` — סכימת `calculateOrderProfit` על כל ההזמנות המסוננות, מוצג בכרטיס פיננסי רביעי "רווח בפועל (משוער)".
- בטבלה נוספו שתי עמודות: **"רווח"** (מציגה `calculateOrderProfit(ord)` + תג "משוער" אם `hairCostActual` עדיין `null`) ו-**"שיוך שיער"** (כפתור שפותח את `AssignHairModal`; אם כבר משויך — מציג את מזהה הקוקו במקום טקסט הפתיחה).
- המודל מוצב בתחתית העמוד; סגירתו לא דורשת רענון ידני — הטבלה מתעדכנת אוטומטית דרך ה-`onSnapshot` הקיים על `orders`.

### `src/pages/Sales/Sales.css`
- `.financial-cards-grid` שונה מ-`repeat(3, 1fr)` ל-`repeat(auto-fit, minmax(200px, 1fr))` כדי להכיל את הכרטיס הרביעי בצורה responsive.
- נוסף `.text-profit` (צבע `--color-accent`).
- נוספו `.cell-profit`, `.cell-hair` לרוחבי העמודות החדשות בטבלה, ו-`.profit-estimated-badge` לתג "משוער".
- נוספו `.hair-assign-btn` / `.hair-assign-btn-assigned` לכפתור עמודת שיוך השיער.

---

## סטיות/החלטות עצמאיות — סיכום מרוכז

1. יצרתי `src/utils/orderProfit.ts` כקובץ util נפרד (לא התבקש שם קובץ ספציפי) כדי שנוסחת הרווח תהיה במקום אחד יחיד.
2. הסרתי מ-`WigOrder` (ב-`types/index.ts`) ארבעה שדות ישנים שלא היו בשימוש (`hairCost`, `netCost`, `skinTopCost`, `extraCosts`).
3. הוספתי יכולת "בטל שיוך" ב-`AssignHairModal` — לא הוזכרה בתוכנית המקורית, אבל נחוצה כדי שהזרימה תהיה שלמה (אפשרות לתקן טעות שיוך).
4. קבעתי `status: 'reserved'` + `assignedOrderId` על הקוקו בזמן שיוך בפועל (ולא רק הורדת משקל), כדי להתחבר לייצוג הקיים כבר במסך המלאי.
5. לא הפכתי את שדות אורך/מבנה/מלאות בשלב 3 של האשף לשדות חובה.
6. הוספתי כרטיס סיכום רביעי "רווח בפועל (משוער)" בטבלת Sales, מעבר לעמודת הרווח לכל שורה — לא התבקש במפורש אבל תואם את הרוח של "בכל מקום שמציגים אותו".
7. שכפלתי כמה מחלקות CSS גנריות (`.field`, `.btn-primary` וכו') בתוך `AssignHairModal.css` במקום להסתמך על `NewOrderWizard.css`, כי גיליתי ש-`Sales.tsx` לא טוען את הקובץ ההוא.
8. לא נגעתי בחישובי "רווח" הקיימים ב-`Dashboard.tsx` ו-`Reports.tsx` — אלה מייצגים P&L כללי של העסק (הכנסות פחות הוצאות מקובץ `expenses`), מושג שונה לגמרי מרווח-לפי-הזמנה. השארתי אותם כפי שהיו כדי לא לערבב שתי משמעויות שונות של "רווח".

---

## מה נשאר לבדוק / לעשות

- **בדיקה חזותית בדפדפן** — כל הבדיקות שבוצעו הן `tsc`, `eslint`, ו-`vite build` בלבד. עדיין לא הרצתי `npm run dev` ועברתי בפועל על הזרימה המלאה (יצירת הזמנה עם פריטי מלאי ואומדן שיער → שיוך שיער בפועל → צפייה בטבלת Sales) בדפדפן.
- **הזמנות ישנות** (שנוצרו לפני הפיצ'ר) לא יכילו את השדות החדשים ב-Firestore בכלל (לא `undefined` בטיפוס בלבד, אלא שהשדה פשוט לא קיים במסמך). הקוד מטפל בזה בעדינות (`?? 0`, `|| []`), אז הן פשוט יוצגו עם רווח = `totalPrice` ותג "משוער" — אבל לא בוצעה מיגרציה בפועל למסמכים קיימים ב-Firestore.
- **אין טרנזקציות Firestore** — הורדת הכמות מ-`bulkItems` (באשף) והורדת המשקל מ-`hairItems` (במודל השיוך) מבוצעות כ-read-then-write מה-state המקומי, לא כ-`runTransaction`. זה עקבי עם דפוס קיים כבר בקוד (`handleUseOne` ב-`Inventory.tsx`), אבל תחת שימוש בו-זמני משתי לשוניות/משתמשות זה עלול לגרום לערכים לא מדויקים (לא שליליים, בגלל ה-`Math.max(0, ...)`, אבל לא בהכרח מדויקים ל-100%).
- **אין ולידציה** שכמות שנבחרה באשף לא עולה על המלאי הזמין, או שגרמים שהוזנו במודל השיוך לא עולים על `currentWeight` של הקוקו — כרגע ניתן "לשלוף" יותר ממה שיש (הכמות רק לא תרד מתחת לאפס).
- **אין אפשרות "שיוך מחדש" ישירה** — כדי לשנות קוקו משויך צריך קודם "בטל שיוך" ואז לשייך קוקו אחר; אין זרימה של "החלף קוקו" בלחיצה אחת.
- **שגיאות ESLint קיימות מראש, לא תוקנו** (לא נגרמו על ידי הפיצ'ר, אך רלוונטיות לקבצים שנגעתי בהם): `NewOrderWizard.tsx` — `any` בפרופ `onOrderCreated`, ותבנית `setState` בתוך effect (גם ב-`AssignHairModal.tsx` החדש, שממשיך את אותה תבנית קיימת); `Sidebar.tsx` ו-`Calendar.tsx` — ייבוא/state לא בשימוש, לא קשור בכלל לפיצ'ר הזה.
- **`RepairsCalculator`** ב-`Calculators.tsx` עדיין מחזיק נוסחת עלות שיער כפולה (מבוססת גרמים ישירים, לא אורך) — לא רופקטר לשימוש ב-`hairCost.ts` כי מחוץ להיקף שהוגדר.
- שום דבר לא נעשה `commit` — כל השינויים עדיין ב-working directory (לא נתבקשתי לבצע commit).
