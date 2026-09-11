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

### חלק ב': כפתור X + ביטול בפועל

טרם בוצע - ממשיך מיד.
