# סיכום: יתרת זכות - שימוש בהזמנה קיימת + ביטול ↔ יומן מדויק (2 משימות)

## משימה 1: שימוש בהזמנה קיימת + שחזור בביטול תשלום ✅ הושלמה

**החלטת קיבוץ commit:** חלק א' וחלק ב' נעשו ב-`npm run build`
נפרד כל אחד (כמבוקש), אבל נדחפים ב-**commit אחד משותף** - שני
החלקים נוגעים לאותו זוג handlers (הוספת/מחיקת תשלום ב-
`OrderDetailsPanel.tsx`) וקשורים הדוקות מדי (חלק ב' הוא ההופכי
המדויק של חלק א' על אותו payment method) כדי שיהיה הגיוני לפצל
אותם ל-2 commits נפרדים לתכונה אחת.

### חלק א': תשלום מיתרת זכות בהזמנה קיימת

**ממצא הכרחי (לא היה נדרש אחרת):** ל-`OrderDetailsPanel.tsx` לא
היתה שום גישה ליתרת הזכות של הלקוחה המקושרת - `order` prop לא
מכיל את זה בכלל. נוסף מאזין `onSnapshot` עצמאי על `clients/{clientId}`
(`clientCreditBalance`), אותו דפוס בדיוק כמו `liveCreditBalance`
ב-`ClientDrawer.tsx`.

בטופס "הוספת תשלום" - אופציה חדשה **"💰 יתרת זכות (₪X)"** ב-`<select>`
(**רק** בטופס ההוספה, לא בטופס העריכה - כמבוקש), מוצגת רק כש-
`order.clientId && clientCreditBalance > 0`. וולידציה: הסכום לא
יכול לעלות על `clientCreditBalance`. בשמירה - מלבד הוספת התשלום
הרגילה ל-`payments`, `updateDoc` נוסף על הלקוחה (`increment(-amount)`
+ `arrayUnion` שלילי, `reason: "תשלום מיתרת זכות בהזמנה קיימת"`) -
אותו דפוס בדיוק כמו ניצול יתרה באשף הזמנה חדשה.

### חלק ב': מחיקת תשלום מיתרת זכות משחזרת אותה

`handleConfirmDeletePayment` - נבדק `removedPayment.method ===
'credit_balance'` **לפני** המחיקה בפועל. אם כן - מלבד ההסרה הרגילה
מ-`payments` (**לא השתנתה**), `updateDoc` נוסף: `increment(+amount)`
+ `arrayUnion` חיובי (`reason: "ביטול תשלום מיתרת זכות"`). לתשלומים
רגילים - **שום שינוי** בהתנהגות. גם עודכן טקסט `ConfirmDialog` המחיקה
- מזכיר במפורש "יוחזרו ליתרת הזכות" **רק** כשהתשלום הנמחק הוא
`credit_balance` (אחרת נשאר הטקסט המקורי, שכולל "לא ניתנת לביטול").

**קבצים:** `src/components/orders/OrderDetailsPanel.tsx`.

**בדיקות:** `npm run build` נקי אחרי כל חלק. `npm run lint` - 24
בעיות, זהה לבייסליין הקבוע, אחרי כל חלק.

## משימה 2: כפתור ביטול (X) בהיסטוריית יתרת זכות

### חלק א': תשתית ids ✅ הושלמה

**`types/index.ts`:** `OrderPayment` קיבל `id: string` (חובה, לא
אופציונלי) - נוצר מעתה בכל תשלום חדש, **כל method** (לא רק
`credit_balance`). `CreditHistoryEntry` קיבל `relatedPaymentId?`/
`relatedExpenseId?` חדשים.

**כל 4 המקומות שיוצרים `OrderPayment` ישירות עודכנו** עם
`crypto.randomUUID()` (זוהו ע"י שגיאות ה-build עצמן - דרך אמינה
למצוא את כולם, לא grep ידני): `NewOrderWizard.tsx` (payment הניצול
האוטומטי), `OrderDetailsPanel.tsx` פעמיים (`handleAddPayment` -
תשלום ידני חדש; `handleSaveEditPayment` - **שומר את ה-id המקורי
של התשלום הנערך, לא מייצר חדש**, כדי שרשומות creditHistory קיימות
שמצביעות עליו לא "יתייתמו"), `QuickRetailSaleModal.tsx` ו-
`SellShowroomStockModal.tsx` (מכירות מיידיות - לא קשור ליתרת זכות,
אבל גם הן צריכות `id` כדי לעמוד בטיפוס המורחב).

**קישור ה-id בפועל בכל מקום שיוצר creditHistory מקושר:**
- `NewOrderWizard.tsx` - `relatedPaymentId` = ה-id של payment
  הניצול האוטומטי.
- `OrderDetailsPanel.tsx` (`handleAddPayment`) - `relatedPaymentId`
  = ה-id של התשלום הידני שנוצר (מחלק 1 קודם היום).
- `ClientDrawer.tsx` (`handleConfirmRefund`) - **סדר הפעולות הוחלף**:
  יוצר את מסמך ה-`expense` **קודם** (לא אחרי), כדי שה-id שלו יהיה
  זמין ל-`relatedExpenseId` ברשומת ה-creditHistory שנכתבת אחריו.

**`handleCancelOrder` (`OrderDetailsPanel.tsx`) - נבדק, לא שונה
בכוונה:** הקרדיט שם נגזר מ-`order.paidAmount` המצטבר (יכול לכלול
כמה תשלומים), לא תשלום בודד - אין `id` יחיד רלוונטי לקשר. הרשומה
כבר מקושרת ל-`relatedOrderId` (מספיק), וזו בדיוק אחת מרשומות
"ביטול הזמנה" שהוחרגו במפורש מכפתור הביטול (ראו חלק ב' - amount
חיובי, לא רלוונטי לפיצ'ר הזה).

**קבצים:** `src/types/index.ts`, `src/components/orders/NewOrderWizard.tsx`,
`src/components/orders/OrderDetailsPanel.tsx`,
`src/components/clients/ClientDrawer.tsx`,
`src/pages/Inventory/QuickRetailSaleModal.tsx`,
`src/pages/Inventory/SellShowroomStockModal.tsx`.

**בדיקות:** `npm run build` נקי (זיהה במדויק את כל 4 נקודות היצירה
של `OrderPayment` שהיו חסרות `id`). `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

### חלק ב': כפתור X + ביטול בפועל ✅ הושלמה

**כפתור X** נוסף לעמודת "פעולות" חדשה בטבלת ההיסטוריה
(`ClientDrawer.tsx`) - מוצג **רק** על שורות עם `amount < 0` (שימוש
בפועל: "ניצול/תשלום מיתרת זכות" ו-"החזר ללקוחה") - **לא** על
"ביטול הזמנה" (`amount` חיובי, כמבוקש במפורש - שינוי גדול יותר,
מחוץ לתחום).

**`ConfirmDialog`** עם טקסט מותאם לפי סוג הרשומה (`relatedExpenseId`
מול `relatedPaymentId`), מזכיר את הסכום המדויק שיוחזר.

**הביטול בפועל** (`handleConfirmUndoCreditEntry`):
- **"החזר ללקוחה"** (`relatedExpenseId`) - `deleteDoc` על מסמך
  ה-expense (מצליח בשקט גם אם כבר לא קיים - Firestore לא זורק על
  מחיקת מסמך לא-קיים, אין צורך בבדיקת-קיום מפורשת קודם).
- **"ניצול/תשלום מיתרת זכות"** (`relatedPaymentId`+`relatedOrderId`)
  - מוצא את ההזמנה **מ-`clientOrders` שכבר טעון חי** (לא query נוסף
  - ההזמנה המקושרת היא תמיד הזמנה של הלקוחה הזו, וכל ההזמנות שלה
  כבר נטענות ב-drawer הזה), מסיר את ה-`payment` עם `id` תואם,
  `updateDoc`. אם ההזמנה או התשלום הספציפי לא נמצאו (הוסרו ידנית
  בנתיים) - מדלג בשקט, ממשיך רק עם הזיכוי ליתרה.
- בשני המקרים: `increment(+amount)` על `creditBalance` +
  `arrayUnion` עם רשומה חדשה **חיובית** (`reason: "ביטול החזר
  ללקוחה"`/`"ביטול ניצול יתרת זכות"`).

**הרשומה המקורית לא נמחקת** - `undoingCreditEntry` (state) מוחזק
כאובייקט שלם, לא אינדקס (התצוגה מציגה `liveCreditHistory` הפוך -
אינדקס-תצוגה לא תואם לאינדקס-מקור, ובכל מקרה לא נדרש לאתר/למחוק
את הרשומה המקורית מהמערך - רק לקרוא ממנה `relatedPaymentId`/
`relatedExpenseId`/`amount`).

**באג אמיתי שנתפס ותוקן לפני build סופי:** `relatedOrderId` על
הרשומה המבטלת נכתב תחילה כ-`undoingCreditEntry.relatedOrderId`
ישירות - אבל לרשומות "החזר ללקוחה" השדה הזה `undefined` מטבעו
(מעולם לא נקבע ב-`handleConfirmRefund`), ו-**Firestore דוחה כתיבת
`undefined` בכל מקום** (גם מקונן בתוך אובייקט במערך, לא רק שדה
top-level) - היה קורס ב-runtime בכל ביטול "החזר ללקוחה". תוקן עם
spread מותנה (`...(x ? {relatedOrderId: x} : {})`), אותו דפוס בדיוק
כמו `orderCreation.ts`.

**קבצים:** `src/components/clients/ClientDrawer.tsx` (state/handler/
`ConfirmDialog`/עמודה חדשה, import `deleteDoc`+`ConfirmDialog`),
`src/components/clients/ClientDrawer.css` (`.credit-history-undo-btn`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום כללי

2 המשימות (4 חלקים) הושלמו: שימוש בהזמנה קיימת + שחזור אוטומטי
בביטול תשלום → תשתית ids מדויקת (כולל תיקון אמיתי ל-3 מקומות ישנים
שהיו חסרות `id`, שה-build עצמו זיהה) → כפתור ביטול מלא בהיסטוריה,
עם הגנת undefined קריטית שנתפסה לפני שהגיעה לפרודקשן. כל חלק עם
build+lint נפרד (Task 1: commit משותף לשני חלקיו - הדוקים מדי
לפצל; Task 2: commit נפרד לכל חלק).
