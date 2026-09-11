# סיכום: יתרת זכות ללקוחה - ביטול הזמנה ששולמה (4 קבוצות)

## קבוצה 1: מודל נתונים ✅ הושלמה

- **`CreditHistoryEntry`** - טיפוס חדש ב-`types/index.ts`:
  `{amount, reason, relatedOrderId?, date}` - `amount` חיובי=הוספת
  זכות, שלילי=החזר/ניצול.
- **`Client`** (`Clients.tsx`) - שני שדות אופציונליים חדשים:
  `creditBalance?: number` (ברירת מחדל 0 - שדה חסר = אין יתרה),
  `creditHistory?: CreditHistoryEntry[]`.
- **`OrderPayment.method`** (`types/index.ts`) - הורחב עם ערך חדש
  `'credit_balance'` (לתשלום שנוצר אוטומטית מניצול יתרת זכות בהזמנה
  חדשה, קבוצה 4) - **לא** ניתן לבחירה בטופס תשלום ידני קיים
  (`OrderDetailsPanel.tsx` - ה-`<option>` שם נשארו בדיוק כמו שהיו,
  4 האפשרויות הידניות בלבד). נוסף label מתאים ("💰 יתרת זכות")
  ל-`PAYMENT_METHOD_LABELS` כדי שהתשלום יוצג נכון בהיסטוריה כשהוא
  קיים, בלי לשבור את בדיקת המיצוי (exhaustiveness) של ה-`Record`.

**קבצים:** `src/types/index.ts`, `src/pages/Clients/Clients.tsx`,
`src/components/orders/OrderDetailsPanel.tsx` (label בלבד).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## קבוצה 2: ביטול הזמנה עם תשלום → יתרת זכות אוטומטית ✅ הושלמה

`handleCancelOrder` (`OrderDetailsPanel.tsx`) - אחרי שני הענפים
הקיימים (ביטול פאת תצוגה / ביטול הזמנה רגילה, שני הענפים משלימים
כרגיל בלי שינוי), נוסף שלב חדש **משותף לשניהם**: אם
`order.paidAmount > 0 && order.clientId` - `updateDoc` אחד ואטומי
על `clients/{clientId}` עם `creditBalance: increment(paidAmount)`
+ `creditHistory: arrayUnion({amount: +paidAmount, reason: "ביטול
הזמנה", relatedOrderId: order.id, date: now})`. תמיד אוטומטי, בלי
לשאול, כמבוקש.

**החלטת scope (לא הוגבל במפורש בבקשה):** הלוגיקה חלה על **שני**
הענפים, כולל ביטול פאת תצוגה (לא רק הזמנה רגילה) - אם לקוחה שילמה
על פאת תצוגה ואז הביטול "מחזיר" אותה למלאי לא-מכור (`clientId:
null`), התשלום שכבר נגבה לא צריך "להיעלם" רק בגלל שההזמנה מתנתקת
מהלקוחה. `order.clientId`/`order.paidAmount` נקראים מה-`order` prop
המקורי (סגור ב-closure), לא מושפעים מה-`updateDoc` על ההזמנה עצמה
שקורה קודם באותה פונקציה.

**עודכן `ConfirmDialog` הקיים:** כשיש תשלום קיים (`order.paidAmount
> 0`), נוספת שורה להודעת האישור - "₪X ישולמו כיתרת זכות ללקוחה
(אוטומטית, ניתן לצפייה ולהחזר בכרטיס הלקוחה)."

**קבצים:** `src/components/orders/OrderDetailsPanel.tsx` (imports
`arrayUnion`/`increment`/`CreditHistoryEntry`, `handleCancelOrder`,
טקסט ה-`ConfirmDialog`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## קבוצה 3: תצוגת יתרת זכות + "החזר ללקוחה" ב-ClientDrawer.tsx ✅ הושלמה

**ממצא ותיקון ארכיטקטוני שהיה הכרחי (לא התבקש במפורש, אבל בלעדיו
הפיצ'ר לא היה עובד נכון):** `client` prop שמגיע מ-`Clients.tsx` הוא
`selectedClient` - state שנקבע **פעם אחת** בלחיצה על שורה, ולא
מתעדכן חי מה-`onSnapshot` של רשימת הלקוחות (`onUpdateClient` prop
שהיה פותר את זה גם לא מחובר בפועל ב-`Clients.tsx`). כלומר יתרת
הזכות הייתה מוצגת פעם אחת ותקועה, גם אחרי שינוי אמיתי (למשל ביטול
הזמנה ב-`OrderDetailsPanel` שנפתח מ-`Sales.tsx`, לא דרך המגירה
הזו בכלל). **התיקון:** מאזין `onSnapshot` חדש, עצמאי, על מסמך
הלקוחה עצמו - אותו דפוס מדויק שכבר קיים בקובץ הזה בשביל
`clientOrders` (מתועד שם: "כדי שהפאנל תמיד יראה עדכון מיידי").

**כרטיס "יתרת זכות"** - מוצג רק כש-`liveCreditBalance > 0` (לא
כרטיס ריק/0), בשורה אחת עם כפתור **"💸 ביצוע החזר ללקוחה"**
(`.credit-balance-row`). לחיצה פותחת טופס קטן (סכום בלבד) עם
וולידציה: סכום תקין (>0) וגם לא עולה על היתרה הקיימת. באישור -
`updateDoc` אטומי (`increment(-amount)` + `arrayUnion` עם רשומה
שלילית, `reason: "החזר ללקוחה"`) - אותו דפוס בדיוק כמו הוספת יתרה
ב-`handleCancelOrder` (קבוצה 2).

**היסטוריית creditHistory** - טבלה קטנה (תאריך/סכום/סיבה, החדש
ראשון), עם `+`/`-` וצבע לפי סימן הסכום. **החלטה:** מוצגת כל עוד יש
רשומות בהיסטוריה, **גם אם היתרה הנוכחית כבר 0** (לדוגמה אחרי ניצול
מלא בהזמנה - קבוצה 4) - "מעקב מלא" כמבוקש, לא רק כשיש יתרה פעילה.

**תיקון lint לאורך הדרך:** מבנה ראשוני של ה-effect (איפוס ל-0/[]
כש-`client` חסר) יצר שגיאת `react-hooks/set-state-in-effect` אמיתית
(setState סינכרוני בגוף effect) - תוקן בהסרת האיפוס: הרכיב כבר
מחזיר `null` כש-`client` חסר, אז אין state "תקוע" גלוי; שתי קריאות
ה-`setState` היחידות שנותרו קוראות רק מתוך ה-callback האסינכרוני
של `onSnapshot` - בדיוק הדפוס שהודעת השגיאה של eslint מציעה במפורש.

**קבצים:** `src/components/clients/ClientDrawer.tsx`,
`src/components/clients/ClientDrawer.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## קבוצה 4: ניצול יתרת זכות ב-NewOrderWizard.tsx ✅ הושלמה

**`ClientOption`** (הטיפוס המשותף שהאשף משתמש בו ללקוחות) קיבל שדה
`creditBalance?: number` חדש. עודכנו **שני מקורות הנתונים** של
`clients` באשף כדי שהשדה יהיה מאוכלס בשני הזרימות: (א) ה-`getDocs`
הפנימי (זרימה רגילה, לקוחה נבחרת בשלב 2), (ב) `ClientDrawer.tsx`'s
`preselectedClient={{...}}` (זרימה שנפתחת מכרטיס לקוחה, מדלגת על
שלב 2) - עודכן להעביר את `liveCreditBalance` (מקבוצה 3) בפועל.

**באנר "יתרת זכות"** - `activeClient` (משתנה חדש: `preselectedClient
?? clients.find(selectedClientId)`) נגזר פעם אחת, ומוצג **מעל כל
שלבי האשף** (לא בשלב יחיד ספציפי) מהרגע שהלקוחה ידועה - כך שהוא
תמיד תואם ל"שלב 1 או 2" שהתבקש בלי לשכפל אותו קוד בכמה מקומות: אם
`preselectedClient` - ידוע כבר בשלב 1; אם לא - נהיה ידוע רק אחרי
שנבחר בשלב 2, אז הבועית "מופיעה" בדיוק מאותה נקודה בזרימה הרגילה.
כולל checkbox "נצל את יתרת הזכות בהזמנה הזו".

**בשמירה (`handleFinish`):** אם מסומן - `creditToApply =
Math.min(client.creditBalance, totalPrice)` (לא ניתן "לשלם" יותר
מהמחיר בפועל). ה-`payment` האוטומטי (`method: "credit_balance"`,
מקבוצה 1) נכלל **כבר בקריאה ל-`createOrder`** (`paidAmount`+`payments`
ראשוניים של ההזמנה החדשה, לא `updateDoc` נפרד אחרי) - `createOrder`
כבר תומך בזה טבעי (`NewOrderInput.paidAmount`/`payments`, לא נדרש
שינוי ב-`orderCreation.ts`). אחרי היצירה (עם ה-`orderId` שהוחזר) -
`updateDoc` אטומי על הלקוחה: `increment(-creditToApply)` +
`arrayUnion` עם רשומה שלילית (`reason: "ניצול ביתרת הזכות בהזמנה
חדשה"`, `relatedOrderId: <ההזמנה החדשה>`).

**גבול scope (לא הורחב מעבר למבוקש):** הפיצ'ר חל רק על זרימת "פאה
חדשה" הרגילה של האשף עצמו - **לא** על תיקון/שירות (`RepairOrderForm`)
או מכירת פאת תצוגה (`SellShowroomStockModal`), ששני אלה מקבלים
hand-off ומודלים נפרדים לגמרי (האשף נסגר לפני שהם נפתחים) - התבקש
במפורש רק "NewOrderWizard.tsx", לא שני המודלים האחרים.

**קבצים:** `src/components/orders/NewOrderWizard.tsx`,
`src/components/orders/NewOrderWizard.css`,
`src/components/clients/ClientDrawer.tsx` (שורה אחת - `creditBalance`
ב-`preselectedClient`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום כללי - כל 4 הקבוצות הושלמו

מודל נתונים (`Client.creditBalance`/`creditHistory`,
`CreditHistoryEntry`, `OrderPayment.method: 'credit_balance'`) →
הוספה אוטומטית ביטול הזמנה ששולמה (שני הענפים, כולל פאת תצוגה) →
תצוגה חיה + החזר + היסטוריה ב-`ClientDrawer.tsx` (כולל תיקון
ארכיטקטוני הכרחי - מאזין חי עצמאי, כי ה-`client` prop הקיים היה
"קפוא") → ניצול ביתרה בהזמנה חדשה (`NewOrderWizard.tsx`, בשתי
זרימות הכניסה). כל קבוצה עם build+lint+commit+push נפרד משלה, 0
בעיות lint חדשות באף שלב.
