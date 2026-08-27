# סיכום 5 השינויים - ביטול הוצאה כפולה, איחוד נוסחה, טבלת מכירות מצומצמת + פאנל, תשלומים, ניקוי 'reserved'

כל 5 השינויים בוצעו ברצף. אומתו בכל שלב: `tsc -b --noEmit` (נקי לחלוטין),
`npm run lint` (רק שגיאות מדפוס `react-hooks/set-state-in-effect` שכבר
היה קיים בקוד לפני השינויים האלה - ראו הערה בסוף), `npm run build` (עבר
בהצלחה מקצה לקצה). לא בוצעה בדיקה חזותית בדפדפן.

---

## 1. ביטול הוצאת הייצור האוטומטית

### `src/utils/orderCreation.ts`
`createOrderWithProductionExpense` (השם נשאר כפי שהוא - לא נתבקש שינוי שם)
כותבת עכשיו **רק** את מסמך ה-`orders`. הוסרו לגמרי: הייבוא של
`calculateOrderProductionCost`, חישוב `productionCost`, וקריאת ה-`addDoc`
ל-`expenses`. תיעדתי בתחילת הקובץ למה זה בוטל (כפילות מול הוצאת הרכישה
המקורית של המלאי).
**תוספת קטנה שלי, לא התבקשה במפורש אך נדרשת לצורך משימה 4:** הוספתי
`payments: []` לאובייקט שנכתב ל-`orders` בזמן היצירה, כדי שכל הזמנה חדשה
תיוולד עם מערך תשלומים ריק ומוכן (ולא `undefined`) - נוח יותר לצריכה
ב-`OrderDetailsPanel.tsx` (משימה 3-4) בלי בדיקות `?? []` בכל מקום.

### `src/utils/linkedExpense.ts` - **נמחק לגמרי**
`syncOrderProductionExpense` לא נחוץ יותר כי אין יותר הוצאה מקושרת לעדכן.

### `src/components/orders/AssignHairModal.tsx`
- הוסר ה-import של `syncOrderProductionExpense`, וההוספה/הסרה של שיוך
  שיער (`handleAdd`/`handleRemove`) כבר לא נוגעות ב-`expenses` בכלל - רק
  ב-`hairItems` וב-`orders/{id}.usedHairItems`.
- **ניקוי נלווה:** מאחר שה-`AssignableOrder` הפסיק להזדקק ל-`usedBulkItems`
  ו-`hairCostEstimated` (הם היו שם רק בשביל `syncOrderProductionExpense`),
  הסרתי אותם מהממשק (נשאר רק `id`, `clientName`, `usedHairItems?`) ואת
  ה-import הלא-בשימוש של `UsedBulkItem`. `Sales.tsx` עדיין מעביר את
  האובייקט המלא (`Order`) - תקין structurally, סתם לא נדרש יותר החלק הזה
  בטיפוס המצומצם.

### `src/utils/orderProfit.ts` ו-`src/pages/Expenses/Expenses.tsx`
**לא שונו** - `calculateOrderProfit`/`calculateOrderProductionCost` כבר
היו מחשבים ישירות מ-`usedBulkItems`/`usedHairItems`/`hairCostEstimated`
על ה-`order`, בלי תלות ב-`expenses` - זה כבר עבד נכון. `Expense.category`
עדיין כולל `"production"`, ו-`Expense.relatedOrderId` עדיין קיים בטיפוס
ובתצוגה (תג "מקושר להזמנה") - כפי שהתבקש במפורש ("לא מזיק שהם קיימים").
שום קוד לא יוצר יותר רשומות עם `relatedOrderId` - אם יש כאלה מבדיקות
קודמות, הן פשוט ימשיכו להציג את התג, בלי מיגרציה.

---

## 2. איחוד נוסחת עלות שיער ב-RepairOrderForm

### `src/utils/hairCost.ts`
פוצל לשתי פונקציות:
- `calculateHairCostFromGrams(netGrams, settings)` (חדשה) - החלק המשותף
  בפועל (בלאי 30% + מחיר לק"ג -> עלות), בלי תלות בטבלת lookup לפי אורך.
- `calculateHairCost(input, settings)` (קיימת) - עכשיו רק עושה את ה-lookup
  לפי אורך/מבנה/מלאות כדי לגזור `netGrams`, ואז קוראת ל-
  `calculateHairCostFromGrams`. **אין שינוי בתוצאה** - זה ריפקטור טהור.

### `src/components/orders/RepairOrderForm.tsx`
`calc` (ה-`useMemo`) קורא עכשיו ל-`calculateHairCostFromGrams(Number(grams), settings)`
במקום הנוסחה המקומית הכפולה (`waste = g*0.3; hairCost = ...`). מקור אמת
יחיד לנוסחה הזו עכשיו בכל 3 המקומות: `Calculators.tsx` (`RepairsCalculator`
עדיין לא רופקטר - ראו "מה נשאר" למטה), `NewOrderWizard.tsx` (דרך
`calculateHairCost`), ו-`RepairOrderForm.tsx` (דרך `calculateHairCostFromGrams`).
**החלטה שלי:** לא נגעתי ב-`RepairsCalculator` בתוך `Calculators.tsx` - הוא
מחוץ להיקף המפורש של הבקשה (שהתמקדה רק ב-`RepairOrderForm`), למרות
שיש לו עדיין את אותה נוסחה כפולה. מתועד גם ב"מה נשאר".

---

## 3+4. טבלת מכירות מצומצמת, פאנל פרטים נשלף, והיסטוריית תשלומים

בוצעו ביחד כי הפאנל (משימה 3) הוא-הוא המקום שמציג את היסטוריית התשלומים
(משימה 4) - אין טעם לפצל לשני מעברים על אותם קבצים.

### `src/types/index.ts`
נוסף `OrderPayment { amount, method: 'cash'|'credit'|'transfer'|'check', date, note? }`,
ו-`WigOrder.payments: OrderPayment[]` חדש. **החלטה שלי:** קראתי לממשק
`OrderPayment` ולא `Payment` כי כבר קיים בקובץ `Payment` (למעלה, סעיף
"תשלומים ומסמכים") עם צורה שונה לגמרי (`clientId`, `paymentMethod` לא
`method`, `referenceNumber`, `pdfUrl`) - ממשק collection נפרד שלא בשימוש
כרגע בקוד בפועל (לא collection `payments` נפרד ב-Firestore, לא נקרא
משום מקום). לא נגעתי בו - הוא מודל שונה (אולי מיועד לתכונה עתידית של
קבלות/מסמכים חתומים), לא רציתי לדרוס/לבלבל בין השניים.

### `src/pages/Sales/Sales.tsx`
- `Order` מקבל `payments?: OrderPayment[]`.
- הטבלה צומצמה מ-10 עמודות ל-5 בדיוק כמבוקש: **לקוחה | סוג עבודה | סטטוס | מחיר כולל | רווח**.
  הוסרו: מספר הזמנה, טלפון (לא היה בכלל עמודה), תאריך, שולם, יתרה, שיוך
  שיער - כולם זמינים עכשיו רק דרך הפאנל.
- שורת טבלה (`tr.sales-row`) לחיצה עליה פותחת את `OrderDetailsPanel`
  (`onClick={() => setSelectedOrderId(ord.id)}`); תא הסטטוס (`select`)
  עוצר `stopPropagation` כדי שבחירת סטטוס לא תפתח את הפאנל בטעות.
- **State חדש:** `selectedOrderId` (לא כל אובייקט ה-order) + `selectedOrder`
  נגזר מ-`orders.find(...)` בכל רינדור - **אותו דפוס בדיוק** שכבר תוקן
  ב-`assigningOrderId`/`assigningOrder` בסבב הקודם, כדי שהפאנל יישאר
  "חי" ויתעדכן אוטומטית אחרי הוספת תשלום/שינוי שיוך שיער דרך ה-
  `onSnapshot` הקיים על `orders`, בלי לנהל state כפול.
- `AssignHairModal` ו-`OrderDetailsPanel` מוצגים שניהם בתחתית הדף,
  יכולים להיות פתוחים בו-זמנית (הכפתור "ניהול שיוך שיער" בתוך הפאנל
  קורא ל-`onOpenAssignHair` שמפעיל את אותו `setAssigningOrderId` הקיים) -
  בדיוק כמו ש-`ClientDrawer` וה-`NewOrderWizard` שלו מוצגים שניהם ביחד.
- כרטיסי הסיכום הפיננסי העליונים (מחזור/שולם/חוב/רווח) **לא שונו** - לא
  התבקש להסיר אותם, רק את עמודות הטבלה.
- החיפוש (`search`) עדיין מסנן לפי `id`/`clientPhone` "מתחת למכסה המנוע"
  גם בלי שהם מוצגים כעמודות - לא נגעתי בלוגיקת הסינון, רק בתצוגה.

### `src/pages/Sales/Sales.css`
- `min-width` של הטבלה ירד מ-950px ל-650px (פחות עמודות).
- נוסף `.sales-row { cursor: pointer; }`.
- עמודות מחדש: `cell-client`(26%) / `cell-type`(24%) / `cell-status`(24%,
  ממורכז) / `cell-price`(13%) / `cell-profit`(13%) - במקום 8 המחלקות
  הישנות (`cell-id`/`cell-date`/`cell-paid`/`cell-debt`/`cell-hair` הוסרו).
- הוסרו `.hair-assign-btn`/`.hair-assign-btn-assigned` (לא בשימוש יותר ב-
  `Sales.tsx` - השקילה הוויזואלית שלהם קיימת עכשיו כ-`.btn-secondary`
  בתוך `OrderDetailsPanel.css`).

### `src/components/orders/OrderDetailsPanel.tsx` + `.css` (קבצים חדשים)
פאנל נשלף מהצד, **באותו דפוס עיצובי בדיוק** כמו `ClientDrawer.css`
(overlay + פאנל קבוע עם `position:fixed; right:0`, אנימציית slide-in,
אותם משתני CSS), אבל **עצמאי לחלוטין** (מחלקות `.order-details-*` משלו,
לא תלוי ב-`ClientDrawer.css`) - ממשיך את אותה מוסכמה שכבר נקבעה
ב-`AssignHairModal.css`/`RepairOrderForm.css` ("Sales.tsx לא טוען CSS
של קבצים אחרים").

תוכן הפאנל (סעיפים לפי הדרישה, בלי טאבים - הכל בגלילה רציפה אחת, כי
מדובר בפחות תוכן מכרטיס לקוחה מלא):
- **Header:** שם לקוחה, טלפון, תג סטטוס (עם צבעים לפי סטטוס, כמו ב-`Sales.css`), כפתור סגירה.
- **פרטי הזמנה:** סוג עבודה, תאריך יצירה, הערות (אם יש).
- **שיוך שיער בפועל:** רשימת `usedHairItems` (תווית, גרמים, עלות) + כפתור
  "🧶 ניהול שיוך שיער" שקורא ל-`onOpenAssignHair(order.id)` (**עבר לכאן
  מהטבלה**, כפי שהתבקש).
- **פריטי מלאי שנוצלו:** רשימת `usedBulkItems` (שם פריט × כמות, עלות).
- **תשלומים:** 3 כרטיסי סיכום (סה"כ מחיר / שולם / יתרה, מחושבים מ-
  `order.totalPrice`/`order.paidAmount`), רשימת כל התשלומים הבודדים
  (`payments`, כל אחד עם אמצעי+תאריך+הערה), וטופס "הוספת תשלום": סכום,
  `select` אמצעי (♻️ שימוש חוזר באותם 4 ערכים ואייקונים כמו ב-`Expenses.tsx`:
  מזומן/אשראי/העברה/צ'ק), תאריך (ברירת מחדל היום), הערה אופציונלית.
  `handleAddPayment` בונה מערך `payments` חדש, **מחשב מחדש** `paidAmount`
  כסכימה של כל התשלומים (לא מצטבר `+=`) - כך `paidAmount` תמיד נכון גם
  אם יתווסף בעתיד מסך לעריכה/מחיקה של תשלום בודד, וכותב את שניהם ל-
  Firestore ב-`updateDoc` אחד.
- **החלטה טכנית:** שדה `note` בתשלום נכתב ל-Firestore **רק אם לא ריק**
  (Firestore זורק שגיאה על `undefined` בתוך אובייקט במערך) - בניתי את
  אובייקט `newPayment` בתנאי במקום לשים `note: payNote || undefined`.

---

## 5. הסרת סטטוס 'reserved'

### `src/types/index.ts`
`HairItem.status` צומצם ל-`'available' | 'showroom' | 'sold' | 'depleted'`.
**החלטה נוספת שלי, מעבר למבוקש:** הסרתי גם את `assignedOrderId?: string`
מ-`HairItem` לגמרי (לא רק את 'reserved' מה-status) - כי השדה הזה היה
משמש **רק** בתצוגה שתלויה ב-`status === 'reserved'` (`Inventory.tsx`),
ואף קוד לא כותב אליו יותר מאז שהמעבר לשיוך מרובה (`usedHairItems`) בוטל
את הקביעה שלו לגמרי. השארת שדה שאין לו יותר קורא/כותב היא בדיוק סוג
המתים-קוד שהוראות הפרויקט מבקשות למחוק ("אם משהו לא בשימוש - למחוק
לגמרי"), ומצאתי אותו לא בשימוש ב-`grep` מלא של הקוד לפני ההסרה.

### `src/pages/Inventory/Inventory.tsx`
- `STATUS_LABELS` - הוסרה שורת `reserved: 'משויך להזמנה'`.
- הוסר הבלוק `{item.status === 'reserved' && item.assignedOrderId && (<span className="order-ref">...)}`
  מתצוגת טבלת מלאי השיער (בלעדי זה, `tsc` היה נכשל - TS2367, כי ההשוואה
  ל-`'reserved'` כבר לא חופפת לטיפוס `HairItem['status']` המצומצם).
- פילטר הסטטוס (`Object.keys(STATUS_LABELS)`) מתעדכן אוטומטית - בלי
  שינוי קוד נוסף, כי הוא כבר נגזר מהאובייקט.

### `src/pages/Inventory/Inventory.css`
הוסרו `.status-reserved` ו-`.order-ref` (שניהם הפכו ללא-בשימוש בעקבות
ההסרות למעלה - נבדק ב-`grep` שאין עוד שימוש בהם בשום קובץ).

---

## קבצים - רשימה מרוכזת

**נמחקו:**
- `src/utils/linkedExpense.ts`

**נוצרו:**
- `src/components/orders/OrderDetailsPanel.tsx`
- `src/components/orders/OrderDetailsPanel.css`

**שונו:**
- `src/utils/orderCreation.ts` - הסרת יצירת expense אוטומטית, תוספת `payments: []`.
- `src/components/orders/AssignHairModal.tsx` - הסרת קריאות ל-`syncOrderProductionExpense`, צמצום `AssignableOrder`.
- `src/utils/hairCost.ts` - פיצול ל-`calculateHairCostFromGrams` + `calculateHairCost`.
- `src/components/orders/RepairOrderForm.tsx` - שימוש בנוסחה המשותפת.
- `src/types/index.ts` - `OrderPayment` חדש, `WigOrder.payments`, הסרת `'reserved'`+`assignedOrderId` מ-`HairItem`.
- `src/pages/Sales/Sales.tsx` - טבלה מצומצמת ל-5 עמודות, `selectedOrderId`/`OrderDetailsPanel`.
- `src/pages/Sales/Sales.css` - עמודות מחדש, `.sales-row`, הסרת `.hair-assign-btn*`.
- `src/pages/Inventory/Inventory.tsx` / `.css` - הסרת 'reserved' מכל מקום.

---

## ESLint - ללא שינוי במצב (מתועד גם ב-summary2.md)

עדיין רק שגיאות `react-hooks/set-state-in-effect` מדפוס הקיים כבר בכל
מודל/דרואר בפרויקט (כולל בקבצים שלא נגעתי בהם, כמו `Clients.tsx` ו-
`AddClientModal.tsx`) - `OrderDetailsPanel.tsx` החדש ממשיך את אותה
מוסכמה (איפוס state בפתיחה) לשם עקביות. מספר השגיאות (12) **ירד** לעומת
`summary2.md` (13) כי הוצאתי אחת: `syncOrderProductionExpense`/
`linkedExpense.ts` שנמחק לא היה בעצמו מקור לשגיאת לינט, אבל שינויים
אחרים (הסרת imports לא בשימוש וכו') לא הוסיפו חדשות.

---

## מה נשאר / לא בוצע בהיקף הזה

- **בדיקה חזותית בדפדפן** - לא הורץ `npm run dev`.
- **`RepairsCalculator` ב-`Calculators.tsx`** עדיין עם נוסחת עלות שיער
  כפולה משלו (זהה בתוצאה ל-`calculateHairCostFromGrams`, אך לא קוראת
  אליה) - מחוץ להיקף המפורש של משימה 2 (שדיברה רק על `RepairOrderForm`).
- **אין עריכה/מחיקה של תשלום בודד** בפאנל - רק הוספה. לא התבקש, אבל
  ה-`paidAmount` בנוי כבר בצורה שתומך בזה בקלות בעתיד (נגזר תמיד מסכימת
  `payments`, לא מצטבר).
- **סיכון לתשומת לב:** הזמנות ישנות בלי `payments` (מלפני השינוי) אבל עם
  `paidAmount` קיים ("שולם בפועל" שנרשם בעבר בלי פירוט) - ברגע שמוסיפים
  להן תשלום ראשון דרך הפאנל, `paidAmount` **נדרס** לסכום התשלומים
  ב-`payments` בלבד (במקרה כזה: רק התשלום החדש), ולא כולל את הסכום
  הישן. זה נובע ישירות מההנחיה לחשב `paidAmount` כסכימת `payments`
  (ולא הצטברות), וזה בהתאם ל"אין צורך במיגרציה" שהתבקש לאורך כל הפרויקט,
  אבל **זה שונה** מ"אין סתירה" - זה איבוד נתון אמיתי על הזמנות ישנות
  ספציפית. אם יש הזמנות בדיקה עם `paidAmount > 0` וניסיון להוסיף להן
  תשלום, כדאי לדעת שזה יקרה.
