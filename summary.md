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

## קבוצה 2: ביטול הזמנה עם תשלום → יתרת זכות אוטומטית

טרם בוצע - ממשיך מיד.

## קבוצה 3: תצוגת יתרת זכות + "החזר ללקוחה" ב-ClientDrawer.tsx

טרם בוצע.

## קבוצה 4: ניצול יתרת זכות ב-NewOrderWizard.tsx

טרם בוצע.
