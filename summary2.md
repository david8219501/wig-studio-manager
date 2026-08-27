# סיכום 4 המשימות - מעקב שיוך שיער, הוצאות אוטומטיות, ותהליכי הזמנה חדשים

מטרה כללית: לתקן באג גלילה באשף ההזמנה, לחבר בין הזמנות להוצאות הייצור שלהן
אוטומטית, לתמוך בשיוך כמה קוקוים (וחלקי קוקו) לאותה הזמנה בלי לאבד משקל
שיורי, ולהוסיף שתי זרימות הזמנה ייעודיות: מכירת פאת תצוגה, וטופס תיקונים נפרד.

כל 4 המשימות בוצעו. אומתו בכל שלב: `tsc -b --noEmit`, `npm run lint`,
`npm run build` (tsc -b + vite build). `npm run build` **עבר בהצלחה מקצה לקצה**
(ראו גם "תיקון צדדי" למטה - היו 2 שגיאות `tsc` שחסמו את כל ה-build עוד לפני
תחילת העבודה, לא קשורות לפיצ'רים האלה, תוקנו כדי שאפשר יהיה בכלל להריץ build).
לא בוצעה בדיקה חזותית בדפדפן (`npm run dev`) - כל האימות הוא קומפילציה/לינט/בילד.

---

## משימה 1: תיקון גלילה באשף ההזמנה

### `src/components/orders/NewOrderWizard.tsx`
עטפתי את כל 4 השלבים (`step === 1..4`) בתוך `<div className="wizard-body">`
חדש, בין ה-header לבין ה-footer. עכשיו המבנה הוא header קבוע → body גולל →
footer קבוע, במקום כרטיס אחד שגדל בלי הגבלה.

### `src/components/orders/NewOrderWizard.css`
- `.wizard-card`: נוסף `max-height: 90vh` (המודל כולו לא חורג מ-90% מגובה המסך).
- `.wizard-body` (חדש): `overflow-y: auto; min-height: 0; flex: 1; display:flex; flex-direction:column; gap:16px;` - ה-`min-height:0` הכרחי כדי שילד flex יוכל בכלל להצטמצם ולגלול (בלעדיו הדפדפן "דוחף" את הכרטיס לגובה מלא של התוכן, בדיוק הבאג המקורי).
- `.wizard-header` / `.wizard-footer`: נוסף `flex-shrink: 0` כדי שלא יידחסו כשה-body גדול.

הבדיקה נעשית גם ויזואלית בהיגיון: עכשיו גם עם הרבה `usedBulkItems` ושני
הבלוקים הנפרדים של שלב 3 (ראו משימה 4א), רק תוכן ה-body גולל.

---

## משימה 2: הוצאת ייצור אוטומטית + מודל פיננסי

### `src/utils/orderCreation.ts` (קובץ חדש)
`createOrderWithProductionExpense(input)` - פונקציה משותפת שיוצרת גם את
מסמך ה-`orders` וגם את מסמך ה-`expenses` המקושר אליו, כדי שכל נקודת כניסה
שיוצרת הזמנה (האשף הרגיל, מכירת פאת תצוגה, טופס התיקונים) תיצור בדיוק את
אותה הוצאה, באותה נוסחה, בלי כפילות קוד.

- כותבת ל-`orders`: כל השדות הרגילים + `usedBulkItems`, `usedHairItems`, `hairCostEstimated` (ראו משימה 3 לשינוי המבנה).
- מחשבת `productionCost = calculateOrderProductionCost(...)` (ראו `orderProfit.ts` למטה).
- כותבת ל-`expenses`: `description: "הוצאת ייצור - {orderType} - {clientName}"`, `amount: productionCost`, `category: "production"`, `date`: תאריך היצירה, `status: "paid"`, `relatedOrderId: orderRef.id`.
- **החלטות עצמאיות:**
  - `supplier: input.clientName` - שדה `supplier` ב-`Expense` הוא חובה; אין "ספק" אמיתי בהוצאת ייצור פנימית, בחרתי בשם הלקוחה כדי שההוצאה תישאר חיפושה/מזוהה בטבלה.
  - `paymentMethod: "cash"` - שדה חובה גם הוא, לא צוין בדרישה; "cash" נבחר כברירת מחדל ניטרלית (זו לא באמת "עסקה בכרטיס" וכו', רק סיווג טכני).
  - `category: "production"` - הוספתי קטגוריה חדשה (ראו שינוי ב-`Expenses.tsx` למטה) כי אף קטגוריה קיימת לא תיארה נכון "עלות ייצור אוטומטית מהזמנה" (`inventory` מתאר רכישות מלאי ידניות, לא צריכת מלאי בפועל בהזמנה).

### `src/utils/linkedExpense.ts` (קובץ חדש)
`syncOrderProductionExpense(orderId, order)` - מוצאת (query לפי `businessId` + `relatedOrderId`) את ההוצאה המקושרת ומעדכנת את `amount` שלה מחדש לפי `calculateOrderProductionCost`. אם אין הוצאה מקושרת (הזמנות ישנות, ראו משימה 3) - לא עושה כלום, בלי שגיאה. נקראת מ-`AssignHairModal.tsx` אחרי כל הוספה/הסרה של שיוך קוקו (משימה 3), וכך גם "אם מסירים שיוך קוקו - מעדכנים בחזרה" מתקיים אוטומטית (חוזר לחשב לפי `hairCostEstimated` כשאין יותר `usedHairItems`).

### `src/utils/orderProfit.ts` (שונה)
פוצל ל-`calculateOrderProductionCost` (בידוד + שיער, בלי `totalPrice`) ו-`calculateOrderProfit` (= `totalPrice - calculateOrderProductionCost`), כדי ש-`orderCreation.ts` ו-`linkedExpense.ts` יוכלו להשתמש רק בחלק עלות הייצור בלי לדרוש `totalPrice`. הוחלף `hairCostActual?: number|null` ב-`usedHairItems?: UsedHairItem[]` (ראו משימה 3): אם יש שיוכים בפועל - סוכמים `costAtTime` שלהם; אחרת `hairCostEstimated ?? 0`.

### `src/pages/Expenses/Expenses.tsx`
- `Expense.category` הורחב עם `"production"`; נוסף `Expense.relatedOrderId?: string`.
- נוסף `"production"` (🧵 ייצור הזמנות) לתפריט הסינון וגם לטופס ההוספה הידנית (כדי שמישהי שתרצה לרשום הוצאת ייצור ידנית תוכל לבחור אותה קטגוריה).
- בטבלה: תג `🔗 מקושר להזמנה` מוצג ליד התיאור כש-`relatedOrderId` קיים (`title` עם מספר ההזמנה).
- **תוספת עצמאית לא מפורשת בדרישה, אך נדרשת מהמשפט "עדיין לאפשר עריכה ידנית של הסכום":** גיליתי ש-`Expenses.tsx` לא היה כולל **בכלל** יכולת עריכה לאף הוצאה (רק הוספה). הוספתי עריכה מוטבעת (inline) לעמודת הסכום: לחיצה על הסכום הופכת אותו לשדה מספר, `Enter`/`blur` שומר (`updateDoc`), `Escape` מבטל. זה חל על **כל** ההוצאות (לא רק מקושרות), כדי לא ליצור אבחנה מלאכותית, ובאמת "לא לנעול" את הסכום של הוצאות מקושרות.

### `src/pages/Expenses/Expenses.css`
נוספו `.linked-order-badge`, `.editable-amount`, `.amount-edit-input`.

---

## משימה 3: שיוך שיער מרובה + תיקון באג משקל שיורי

### `src/types/index.ts`
- `HairItem.status` הורחב עם `'sold'` (ראו משימה 4א להסבר הבחירה).
- `assignedOrderId` הפך להערה "legacy" - עדיין קיים בטיפוס (לא נמחק, כדי לא לשבור תיעוד/תצוגה של Firestore ישן), אבל שום קוד חדש לא כותב אליו יותר (ראו למטה למה).
- נוסף `UsedHairItem { hairItemId, hairItemLabel, gramsUsed, costAtTime }`.
- `WigOrder`: הוסרו `hairItemId` / `hairGramsUsed` / `hairCostActual` הבודדים, הוחלפו ב-`usedHairItems: UsedHairItem[]`.

### `src/components/orders/AssignHairModal.tsx` (נכתב מחדש במלואו)
עבר ממודל "שיוך יחיד" למודל "הוסף עוד" (כמו `usedBulkItems` באשף):
- `AssignableOrder` צומצם ל-`{ id, clientName, usedHairItems?, usedBulkItems?, hairCostEstimated? }` - השדות האחרונים דרושים רק כדי להעביר ל-`syncOrderProductionExpense`.
- **מקור האמת ל"הזמנה הנוכחית" השתנה**: קודם `Sales.tsx` שמר את כל אובייקט ה-`Order` שנלחץ ב-state נפרד (`assigningOrder`), שהיה "קופא" ברגע הפתיחה ולא מתעדכן. עכשיו `Sales.tsx` שומר רק `assigningOrderId`, וגוזר `assigningOrder = orders.find(o => o.id === assigningOrderId)` בכל רינדור - כך שכל כתיבה ל-Firestore בתוך המודל (הוספה/הסרה) חוזרת דרך ה-`onSnapshot` הקיים בעמוד ומעדכנת את המודל **בלי** שהמודל יצטרך לנהל עותק מקומי של `usedHairItems`. זו הייתה החלטה משמעותית שלי לא מפורשת בדרישה, אבל הכרחית כדי ש"הוסף עוד" יעבוד בלי לסבך את הקוד בסנכרון state כפול.
- קטלוג הקוקוים (`hairItems`) עדיין נטען ב-`getDocs` חד-פעמי (לא `onSnapshot`) כמו קודם, אבל עכשיו מרוענן (`loadHairItems()`) אחרי כל הוספה/הסרה, כדי שהמשקל/סטטוס המעודכנים יהיו נכונים אם ממשיכים להוסיף עוד שיוך באותה פתיחה של המודל.
- **הוספת שיוך (`handleAdd`):**
  1. בודק `gramsUsed > 0` **וגם שלא עולה על `currentWeight`** - זו הוספה שלי, ולידציה שלא הייתה קיימת קודם (לא צוינה בדרישה, אבל היא בדיוק ההגנה הנדרשת נגד המשך אותו סוג באג של "לשלוף יותר ממה שיש").
  2. `costAtTime = costPrice * (grams / initialWeight)`, `newCurrentWeight = max(0, currentWeight - grams)`.
  3. **תיקון הבאג המרכזי:** `status` מתעדכן ל-`'depleted'` רק אם `newCurrentWeight < 1` גרם (קבוע `DEPLETED_THRESHOLD_GRAMS`); אחרת נשאר `'available'` - כך שארית קוקו **ממשיכה להופיע כזמינה לשיוך** להזמנות אחרות. בניגוד לקוד הקודם, אין יותר קביעת `status:'reserved'` + `assignedOrderId` בזמן שיוך - כי שיוך כבר לא בלעדי (כמה הזמנות יכולות לחלוק את אותו קוקו).
  4. כותב `usedHairItems` (מערך מלא, לא `arrayUnion`, כדי לשלוט בדיוק בתוכן) ל-`orders/{id}`, וקורא ל-`syncOrderProductionExpense`.
- **הסרת שיוך בודד (`handleRemove`):** מחזיר `currentWeight += gramsUsed` ו-`status: 'available'` תמיד (גם אם היה `'depleted'`), מסיר את הפריט מהמערך לפי אינדקס, וגם קורא ל-`syncOrderProductionExpense` (כך שההוצאה המקושרת "חוזרת אחורה" לעלות הנמוכה יותר).
- **ה-status `'reserved'` הופך בפועל ללא-בשימוש** על ידי קוד חדש (עדיין קיים בטיפוס ומוצג ב-`Inventory.tsx` למי שיש נתוני בדיקה ישנים במצב הזה) - כי "שיוך בלעדי" כבר לא תואם את המודל של שיוך מרובה/חלקי. לא נדרש מיגרציה (לפי ההנחיה המפורשת של המשתמש).
- אין יותר כפתור "בטל שיוך" גלובלי - הוחלף בכפתור הסרה (✕) לכל שורת שיוך בנפרד ברשימה, בדיוק כמו התבנית של `usedBulkItems`.

### `src/components/orders/AssignHairModal.css`
נוספו `.assign-hair-add-section` / `.assign-hair-add-label` / `.assign-hair-add-btn`, ו-`.bulk-item-list` / `.bulk-item-row` / `.bulk-item-remove-btn` בגרסה עצמאית (מוצמדת ל-`.assign-hair-card`) - כדי להציג את רשימת השיוכים הקיימים באותה שפה חזותית כמו רשימת ה-`usedBulkItems` באשף, בלי תלות ב-CSS של קובץ אחר (ממשיך את ההחלטה מהשלב הקודם ש-`Sales.tsx` לא טוען את `NewOrderWizard.css`).

### `src/utils/orderProfit.ts`
ראו משימה 2 - `calculateOrderProductionCost`/`calculateOrderProfit` כבר מטפלים ב-`usedHairItems` (סכימת `costAtTime` כשיש שיוך בפועל, אחרת `hairCostEstimated`).

### `src/pages/Sales/Sales.tsx`
- `Order`: הוסר `hairItemId`/`hairGramsUsed`/`hairCostActual`, נוסף `usedHairItems?: UsedHairItem[]`.
- `assigningOrder` (state) → `assigningOrderId` (state) + `assigningOrder` נגזר (ראו הסבר למעלה ב-`AssignHairModal`).
- `isEstimatedProfit` מחושב עכשיו לפי `!usedHairItems || usedHairItems.length === 0` (במקום `hairCostActual == null`).
- עמודת "שיוך שיער": במקום מזהה קוקו בודד, מציגה **מספר קוקוים משויכים** ("🧶 N קוקוים משויכים") כשיש לפחות שיוך אחד.

---

## משימה 4: שני פיצ'רים חדשים

### 4א. פאת תצוגה → מכירה

**נקודת הכניסה בפועל שנמצאה/הוחלפה:** לא היה כפתור "פאת תצוגה" נפרד בממשק
(לא בכרטיס לקוחה ולא בזרימת ההזמנה) - הדבר הכי קרוב היה כרטיס הבחירה
"פאת מלאי" בשלב 1 של `NewOrderWizard` (`orderType === "inventory"`), שפתח
בדיוק את אותו טופס הזמנה מלא (specs/פילים + אומדן שיער + תשלום), בלי שום
זיקה למלאי בפועל. **החלטה עצמאית:** שיניתי את התווית של הכרטיס הזה מ-"פאת
מלאי" ל-**"פאת תצוגה"** (מזהה הפנימי `orderType` נשאר `"inventory"` כדי לא
לגעת בכל מקום אחר שמשתמש בו) - כי `HairItem.status === 'showroom'` כבר
מתויג בכל האפליקציה (`Inventory.tsx`) בתור **"פאת תצוגה"**, וזו בדיוק
המשמעות העסקית המבוקשת: מכירת קוקו/פאה שכבר קיימים במלאי כפאת תצוגה, לא
בניית פאה חדשה.

**המימוש (`NewOrderWizard.tsx`):**
- כשנבחר `orderType === "inventory"`, שלב 3 של האשף מוחלף לגמרי: במקום פילים (מידה/תנועה/עבודת יד) ואומדן שיער, מוצגת **רשימת בחירה** מתוך `hairItems` בסטטוס `status === 'showroom'` (נטענים באותו `useEffect` שטוען לקוחות/`bulkItems`, מסוננים ב-`useMemo`), עם חיפוש לפי מזהה/גוון. בלוק ה"פריטי מלאי שנוספו להזמנה" (רשת/קופסה) ובלוק ההערות **נשארים משותפים** לשני סוגי ההזמנה (עדיין רלוונטי, למשל קופסת מתנה לפאת תצוגה) - החלטה שלי, לא נדרשה במפורש, אבל אין סיבה להעלים את זה.
- כפתור "הבא" משלב 3 לשלב 4 חסום כל עוד לא נבחרה פאת תצוגה (`disabled` נוסף).
- ב-`handleFinish`: כש-`orderType === "inventory"`, נבנה `usedHairItems` עם רשומה יחידה: `gramsUsed = initialWeight` (כל המשקל), `costAtTime = costPrice` (100% מהעלות), ו-`hairCostEstimated` נשלח כ-`0` (כי `calculateOrderProductionCost` ממילא מעדיף `usedHairItems` על פני `hairCostEstimated` כשיש שיוך). אחרי היצירה, `hairItems/{id}` מתעדכן ל-`status: 'sold'`, `currentWeight: 0`.
- **החלטת ערך הסטטוס:** הוספתי סטטוס חדש `'sold'` ל-`HairItem.status` (`'available' | 'reserved' | 'showroom' | 'sold' | 'depleted'`), עם תווית "נמכרה" ב-`Inventory.tsx` (+ צבע badge חדש ב-`Inventory.css`). שקלתי לעשות שימוש חוזר ב-`'depleted'` הקיים ("נוצל"), אבל זה מבלבל סמנטית - "נוצל" מתאר קוקו גולמי שהשיער שלו אזל בתהליך ייצור, לא פאה מוגמרת שנמכרה ללקוחה. `'sold'` נפרד ומדויק יותר, ומאפשר בעתיד לדווח על "כמה פאות תצוגה נמכרו" בנפרד מ"כמה קוקו גולמי נוצל".
- **לתשומת לב:** לא קיימת כרגע שום נקודת ממשק שמאפשרת לסמן `hairItem` בתור `status: 'showroom'` מלכתחילה (`AddHairModal.tsx` תמיד יוצר `status: 'available'`). כלומר הפיצ'ר הזה יעבוד ברגע שיהיו רשומות עם `status === 'showroom'` (למשל שהוזנו ידנית ב-Firestore, כמו שכבר קיים ב-`STATUS_LABELS`/פילטר של `Inventory.tsx`), אבל לא הוספתי דרך ליצור כאלה מהממשק - זה מחוץ להיקף המפורש של המשימה (שהתמקדה בזרימת ה**מכירה**, לא בסימון ה**קבלה** למלאי כפאת תצוגה).

### 4ב. טופס תיקונים נפרד

**נקודת הכניסה שהוחלפה:** בחירת "תיקון / שירות" בשלב 1 של `NewOrderWizard`
המשיכה, כמו "פאת מלאי", לאותו טופס מלא בן 4 שלבים. **החלטה עצמאית:**
השארתי את הכרטיס עצמו (שלב 1, `orderType === "repair"`) כפי שהוא, אבל
שיניתי את מה שקורה בלחיצה על "הבא" **בסוף שלב 2** (אחרי שהלקוחה כבר נבחרה,
בין אם דרך `preselectedClient` או דרך חיפוש): אם `orderType === "repair"`,
האשף לא ממשיך לשלב 3 - הוא קורא ל-`onOpenRepairForm(client)` (prop חדש
שהוספתי ל-`NewOrderWizardProps`) וסוגר את עצמו. בחרתי בנקודת המעבר "סוף
שלב 2" (לא "סוף שלב 1") כדי שהטופס הנפרד יעבוד גם אם בעתיד ייפתח האשף בלי
`preselectedClient` (מקרה שלא קיים כרגע בפועל - `ClientDrawer` הוא נקודת
הכניסה היחידה, ותמיד מעביר `preselectedClient` - אבל כך הלוגיקה נכונה
בכל מקרה בלי תלות בכך).

### `src/components/orders/RepairOrderForm.tsx` + `.css` (קבצים חדשים)
טופס נפרד ופשוט, מבוסס ישירות על הנוסחה של `RepairsCalculator` ב-
`Calculators.tsx` (עלות שיער **ישירות מגרמים**, לא מאורך/מבנה/מלאות):
`waste = grams*0.3`, `hairCost = pricePerKgUsd*exchangeRate*(grams+waste)/1000`,
`mfgCost = hairCost + skinTop + net + color + extra`,
`suggestedPrice = mfgCost * (1 + profitMargin/100)`.
- שדות: גרם שיער (חובה), סקין/טופ, רשת, צבע, נוספות (כולם ₪, כמו במחשבון), הערות חופשיות.
- שדה "מחיר ללקוחה" מוצע אוטומטית לפי `suggestedPrice` אבל **ניתן לעריכה חופשית**; ברגע שהמשתמשת נוגעת בו (`priceTouched`), ההצעה האוטומטית מפסיקה לדרוס אותו אם משנים גרמים/עלויות אחר כך.
- `settings` (`pricePerKgUsd`/`exchangeRate`/`profitMargin`) נטענים מ-`businessSettings/{businessId}`, אותו מסמך שמשמש גם את `Calculators.tsx` וגם את `NewOrderWizard.tsx` - עקביות מלאה בין שלושת המקומות.
- **החלטה עצמאית מרכזית:** ל-`Order`/`WigOrder` אין שדות נפרדים לעלויות "סקין/טופ/רשת/צבע/נוספות" - יש רק `hairCostEstimated` אחד. לכן **כל `mfgCost`** (כולל עלות השיער עצמה) נכנס כמקשה אחת ל-`hairCostEstimated` בקריאה ל-`createOrderWithProductionExpense`. הפירוט (כמה משיער, כמה מסקין/טופ וכו') נשמר רק כטקסט חופשי ב-`notes` של ההזמנה, לא כשדות מובנים - כדי לא להרחיב את מודל הנתונים הראשי (`WigOrder`/`Order`) עם שדות שרלוונטיים רק לתיקונים.
- הטופס לא נוגע ב-`usedBulkItems` (נשלח מערך ריק) - לתיקונים אין כרגע צריכה ממלאי הפריטים הפשוטים; ניתן להוסיף בעתיד אם יידרש.
- עיצוב: `RepairOrderForm.css` עצמאי לגמרי (לא תלוי ב-CSS של קבצים אחרים), באותה מוסכמה כמו `AssignHairModal.css`.

### `src/components/clients/ClientDrawer.tsx`
- ייבוא `RepairOrderForm` + `ClientOption` (מיוצא עכשיו מ-`NewOrderWizard.tsx`).
- state חדש `repairFormClient: ClientOption | null`.
- `NewOrderWizard` מקבל `onOpenRepairForm={(c) => setRepairFormClient(c)}`.
- `<RepairOrderForm isOpen={repairFormClient !== null} client={repairFormClient} onClose={...} onCreated={...} />` מוצג לצד ה-`NewOrderWizard` הקיים.

---

## תיקון צדדי (לא חלק מ-4 המשימות, אך נדרש כדי שה-build בכלל ירוץ)

לפני תחילת העבודה, `npm run build` **כבר נכשל** (ב-`tsc -b`, לפני שלב ה-
`vite build`) בגלל שתי שגיאות שלא קשורות לפיצ'רים האלה, בקבצים שלא נגעתי
בהם קודם ושלא היו שונים מ-HEAD (כלומר קיימות גם ב-commit האחרון, לא רק
בעבודה הזאת):
- `src/components/Sidebar/Sidebar.tsx`: `import React from "react"` לא בשימוש (הקובץ לא משתמש ב-JSX ישיר שדורש את זה, רק ב-TSX עם JSX transform חדש).
- `src/pages/Calendar/Calendar.tsx`: `saveError`/`setSaveError` מוגדרים ולא בשימוש בכלל בקובץ.

הסרתי את שתי השורות הלא בשימוש בשני הקבצים (ללא שינוי התנהגות) כדי
שאפשר יהיה בכלל להריץ `npm run build` מקצה לקצה ולוודא שהפיצ'רים החדשים
לא שוברים כלום. זו לא הייתה מבוקשת במפורש, אבל בלעדיה לא ניתן לקיים את
הדרישה "בכל שלב תריץ ... vite build לוודא שאין שגיאות".

---

## ESLint - מצב סופי

`npm run lint` **לא** נקי לגמרי, אבל כל השגיאות הנותרות הן מדפוס קיים כבר
בקוד (לא נוצר על ידי המשימות האלה, ומופיע גם בקבצים שלא נגעתי בהם כמו
`Clients.tsx`): קריאה ל-`setState` בגוף `useEffect` בזמן איפוס state כשמודל
נפתח (`react-hooks/set-state-in-effect`) - מופיע גם ב-`NewOrderWizard.tsx`
(היה כבר לפני), `AssignHairModal.tsx` (היה כבר לפני, בגרסה הישנה), ונוסף
גם ב-`RepairOrderForm.tsx` החדש **באותה תבנית בדיוק** (כדי לשמור על עקביות
עיצובית עם שאר הקומפוננטות - כל מודל בפרויקט הזה מאפס state כך). לא תיקנתי
את הדפדוד הזה כי זה שינוי ארכיטקטוני רוחבי (יצטרך לגעת בכל מודל בפרויקט,
כולל `Clients.tsx` שלא קשור בכלל למשימות האלה) - מחוץ להיקף.
כמו כן `NewOrderWizard.tsx` עדיין עם `onOrderCreated: (orderData: any) => void`
(`no-explicit-any`) - זה היה קיים כבר לפני השינויים שלי, לא נגעתי בו.
2 אזהרות (לא שגיאות) ב-`Calculators.tsx` (`exhaustive-deps`) - קובץ שנגעתי
בו קודם (שלב הפיצ'ר הקודם), לא קשור למשימות הנוכחיות, לא תוקן.

---

## קבצים - רשימה מרוכזת

**נוצרו:**
- `src/utils/orderCreation.ts`
- `src/utils/linkedExpense.ts`
- `src/components/orders/AssignHairModal.tsx` (נכתב מחדש - הקובץ עצמו כבר היה קיים כ-untracked לפני תחילת השיחה הזו, אך תוכנו הוחלף במלואו)
- `src/components/orders/AssignHairModal.css` (עודכן משמעותית - נוספו חלקים)
- `src/components/orders/RepairOrderForm.tsx`
- `src/components/orders/RepairOrderForm.css`

**שונו:**
- `src/types/index.ts` - `UsedHairItem` חדש, `HairItem.status` + `'sold'`, `WigOrder.usedHairItems` במקום 3 שדות בודדים.
- `src/utils/orderProfit.ts` - פיצול ל-`calculateOrderProductionCost`/`calculateOrderProfit`, תמיכה ב-`usedHairItems`.
- `src/components/orders/NewOrderWizard.tsx` - עטיפת גלילה, זרימת פאת תצוגה, קיצור דרך לטופס תיקונים, שימוש ב-`createOrderWithProductionExpense`.
- `src/components/orders/NewOrderWizard.css` - `.wizard-body` לגלילה.
- `src/components/clients/ClientDrawer.tsx` - חיווט `RepairOrderForm` + `onOpenRepairForm`.
- `src/pages/Sales/Sales.tsx` - `Order` type, `assigningOrderId` נגזר במקום state קופא, עמודת "שיוך שיער" מרובה.
- `src/pages/Expenses/Expenses.tsx` - קטגוריית `production`, `relatedOrderId`, תג "מקושר להזמנה", עריכת סכום מוטבעת.
- `src/pages/Expenses/Expenses.css` - סגנונות לתג ולעריכה המוטבעת.
- `src/pages/Inventory/Inventory.tsx` - `STATUS_LABELS.sold`.
- `src/pages/Inventory/Inventory.css` - `.status-sold`.
- `src/components/Sidebar/Sidebar.tsx`, `src/pages/Calendar/Calendar.tsx` - תיקון צדדי (ייבוא/state לא בשימוש) כדי ש-build ירוץ.

---

## מה נשאר לבדוק / לעשות (לא בוצע בהיקף הזה)

- **בדיקה חזותית בדפדפן** - לא הורץ `npm run dev`. כל האימות הוא `tsc`/`eslint`/`vite build`.
- **אין UI ליצירת `hairItem` בסטטוס `showroom`** מלכתחילה (ראו הערה במשימה 4א) - כרגע ניתן להגיע לסטטוס הזה רק ידנית ב-Firestore.
- **אין ולידציה** שכמות `usedBulkItems` שנבחרה באשף לא עולה על המלאי הזמין (כמו לפני) - רק שיוך שיער בפועל (משימה 3) קיבל ולידציה כזו.
- **אין טרנזקציות Firestore** - כל העדכונים (מלאי, הוצאה מקושרת, הזמנה) הם כתיבות נפרדות עוקבות, לא `runTransaction` - עקבי עם התבנית הקיימת כבר בכל הפרויקט (`handleUseOne` ב-`Inventory.tsx` וכו'), אך תחת גישה בו-זמנית משתי לשוניות יכול ליצור חוסר דיוק זמני.
- הזמנות ישנות (טרום-פיצ'ר) עם `hairItemId`/`hairGramsUsed`/`hairCostActual` הישנים פשוט יוצגו כאילו אין להן שיוך שיער כלל (`usedHairItems` יהיה `undefined`) - בהתאם להנחיה המפורשת שלא נדרשת מיגרציה.
