# סיכום: עיצוב מחדש של "פאות תצוגה" - מודל מבוסס orders במקום HairItem.status

## למה זה קרה

המודל הקודם (מהסבב הקודם) ייצג פאת תצוגה כקוקו בודד (`HairItem` עם
`status: 'showroom'`) - מגבלה מובנית: לא ניתן היה לייצג פאת תצוגה
שנבנית מכמה קוקוים שונים (שיוך מרובה), בדיוק כמו הזמנת לקוחה רגילה.

## החלטת הארכיטקטורה החדשה

פאת תצוגה היא עכשיו מסמך רגיל ב-collection `orders` (בדיוק כמו הזמנת
לקוחה), עם `isShowroomStock: true` ו-`clientId`/`clientName: null` עד
שנמכרת בפועל. `usedHairItems` (שיוך שיער בפועל) עובד בדיוק כמו בהזמנה
רגילה - יכול לכלול כמה קוקוים. הסטטוס "בבנייה"/"מוכנה" לא נשמר כשדה -
מחושב תמיד מ-`usedHairItems.length > 0`.

**בוטל לגמרי** המודל הקודם: הוסר הכפתור "סמן כפאת תצוגה" מטבלת מלאי
השיער, `handleMarkAsShowroom`/`handleReturnToAvailable`, ה-state/הלשונית
הישנים מבוססי `HairItem.status==='showroom'`, וה-prop
`preselectedShowroomItemId` שנוסף ל-`NewOrderWizard.tsx` בסבב הקודם -
`NewOrderWizard.tsx` חזר בדיוק לגרסה שלפני אותו סבב (`git diff` מול
הקומיט הקודם ל-76f7641 ריק לגמרי). `HairItem.status: 'showroom'`
(הטיפוס עצמו) לא נגע - רק הגישה שהשתמשה בו בוטלה.

## שינויים לפי קובץ

### `src/utils/orderCreation.ts`
- `clientName` ב-`NewOrderInput` הורחב ל-`string | null` (null רק
  כש-`isShowroomStock`).
- נוספו שדות אופציונליים: `isShowroomStock`, `retailPrice`,
  `showroomSpecs` (טיפוס חדש `ShowroomSpecs` - אורך/מבנה/מלאות/גוון
  גולמיים, נשמרים בנוסף ל-`notes` הקריא כדי לאפשר עריכה חוזרת בלי
  לפרסר מחרוזת). `createOrder` כותב אותם רק כשרלוונטי (Firestore דוחה
  `undefined`).
- נוספה `isUnsoldShowroomStock(order)` - הפרדיקט המשותף שקובע אם
  מסמך `orders` הוא פאת תצוגה שעדיין לא נמכרה (`isShowroomStock &&
  !clientId`). מוגדר כאן (לא ב-`Sales.tsx`) עם טיפוס פרמטר כללי כדי
  למנוע import מעגלי (`Sales.tsx` כבר מייבא `ShowroomSpecs` מהקובץ
  הזה).

### `src/pages/Sales/Sales.tsx`, `Dashboard.tsx`, `Reports.tsx`
- `Order` (ב-`Sales.tsx`, הטיפוס המשותף) הורחב עם `clientId`,
  `isShowroomStock`, `retailPrice`, `showroomSpecs`.
- כל שלוש ה-onSnapshot listeners של `orders` מסננות עכשיו החוצה
  `isUnsoldShowroomStock` - **קריטי**: בלי הסינון הזה, פאת תצוגה
  שעדיין בבנייה (בלי לקוחה) הייתה "מזהמת" את טבלת המכירות/הדשבורד/
  הדוחות. מרגע שנמכרת (מקבלת `clientId`) - מפסיקה אוטומטית להיות
  מסוננת ומופיעה בהן כרגיל.

### `src/pages/Inventory/ShowroomStockFormModal.tsx` (חדש)
טופס יצירה/עריכה מצומצם: אותם שדות/אפשרויות בדיוק כמו שלב 3
ב-`NewOrderWizard.tsx` (אורך/מבנה/מלאות/גוון, `HAIR_LENGTH_OPTIONS`/
`STRUCTURE_OPTIONS`/`FULLNESS_OPTIONS`, `calculateHairCost` לאומדן
עלות) + שדה מחיר מכירה מבוקש. יצירה קוראת ל-`createOrder`; עריכה
עושה `updateDoc` על אותו מסמך - לא נוגעת ב-`usedHairItems` בכלל.

### `src/pages/Inventory/SellShowroomStockModal.tsx` (חדש)
השלמת מכירה: בחירת לקוחה (אותו דפוס בדיוק כמו ב-`QuickRetailSaleModal.tsx`)
+ מחיר סופי (ממולא מראש מ-`retailPrice`, ניתן לעריכה). מעדכן
(לא יוצר!) את אותו מסמך: `clientId`/`clientName`/`clientPhone`,
`totalPrice`/`paidAmount` מהמחיר הסופי, `status: "delivered"`,
`payments`. `isShowroomStock` נשאר `true` לתיעוד היסטורי.

### `src/pages/Inventory/Inventory.tsx`
- listener שלישי (`orders`, מסונן רק ל-`businessId` כמו כל מקום אחר
  באתר) בנוסף ל-`hairItems`/`bulkItems` הקיימים.
- `showroomOrders` = `orders.filter(isShowroomStock && !clientId)`.
- לשונית "פאות תצוגה" מציגה טבלה: מפרט (`notes`), עלות מחושבת (סכימת
  `costAtTime` על `usedHairItems`, "—" אם ריק), מחיר מכירה מבוקש,
  תג סטטוס בבנייה/מוכנה, וכפתורי ניהול שיוך שיער / עריכה / מכירה /
  מחיקה.
- "ניהול שיוך שיער" פותח את `AssignHairModal` **הקיים ללא שינוי** -
  מצביע אותו על מסמך ה-order של פאת התצוגה (עם `clientName` תווית
  תצוגה בלבד, לא לקוחה אמיתית).
- מחיקה: `ConfirmDialog` (עם הודעה שונה אם כבר יש שיוך שיער בפועל),
  ולפני מחיקת המסמך - מחזירה משקל/שווי לכל `hairItem` ששויך (מקובץ
  לפי `hairItemId` כדי לא לדרוס update אחד עם השני אם אותו קוקו שויך
  כמה פעמים - אותה בעיה שכבר תוקנה קודם ב-`NewOrderWizard.handleFinish`).
- כל ה-IDs (`assigningShowroomOrderId` וכו') נגזרים חי מ-`orders`
  (כמו `mergeLogBox` הקיים) - לא state של אובייקט מלא - כדי שהמודלים
  תמיד יראו נתון עדכני.

## תיקון לינט תוך כדי

הוספת `isUnsoldShowroomStock` כ-export פונקציה רגילה מ-`Sales.tsx`
(לצד `export default function Sales()`) הפעילה שגיאת
`react-refresh/only-export-components` חדשה. הועבר ל-`orderCreation.ts`
במקום (עם טיפוס פרמטר כללי, לא `Order`, כדי למנוע import מעגלי).

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות; שתי הקבצים החדשים
  (`ShowroomStockFormModal.tsx`, `SellShowroomStockModal.tsx`) מציגים
  את אותה אזהרת `react-hooks/set-state-in-effect` הקיימת כבר במקומות
  דומים (`QuickRetailSaleModal.tsx`, `RepairOrderForm.tsx` וכו') -
  דפוס מקובל בפרויקט, לא בעיה חדשה.
- `git diff` מול הקומיט שלפני הסבב הקודם מוודא ש-`NewOrderWizard.tsx`
  חזר בדיוק לגרסתו המקורית (diff ריק).
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל (יצירה/עריכה/שיוך שיער/מכירה/
  מחיקה של פאת תצוגה, והיעלמות/הופעה נכונה בטבלאות Sales/Dashboard/
  Reports) - מומלץ לבדוק ידנית לפני סמיכה מלאה, בפרט את זרימת המכירה
  המלאה מקצה לקצה.
