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

## קבוצה 3: תצוגת יתרת זכות + "החזר ללקוחה" ב-ClientDrawer.tsx

טרם בוצע.

## קבוצה 4: ניצול יתרת זכות ב-NewOrderWizard.tsx

טרם בוצע.
