# סיכום: תיקון "רווח החודש" + InfoTooltip גלובלי (2 חלקים)

## חלק א': תיקון נוסחת "רווח החודש" ב-Dashboard.tsx ✅ הושלמה

**ממצא לפני התיקון (שונה מהתיאור "כרגע" בבקשה):** הקוד **כבר** השתמש
ב-`calculateOrderProfit` (לא `totalPrice` גולמי), אבל **בלי שום
הפחתת הוצאות בכלל** (Dashboard.tsx לא טען `expenses` collection
בכלל) **ובלי החרגת הזמנות "בוטלה"**. כלומר "רווח החודש" כלל בטעות
גם הזמנות מבוטלות, ולא הפחית הוצאות תפעול בכלל - לא מה שהבקשה תיארה
כ"מצב קיים", אבל התוצאה הסופית שהתבקשה זהה בכל מקרה.

**התיקון:**
- נוסף מאזין Firestore חדש ל-`expenses` (לא היה קיים ב-Dashboard.tsx).
- `thisMonthRevenue`/`lastMonthRevenue` מחושבים כעת (`monthlyOperationalProfit`
  משותפת לשני החודשים):
  ```
  Σ calculateOrderProfit(order) [לחודש, status !== "בוטלה"]
  - Σ expenses.amount [לחודש, לא "מלאי וספקים"]
  ```
- **קטגוריית "מלאי וספקים" מזוהה נכון** (legacy `"inventory"` + החדש
  `"מלאי ושיער"`) - לא שוכפל inline; נוצרה פונקציה משותפת חדשה
  `isInventoryExpenseCategory` (`src/utils/businessSettings.ts`),
  ו-**גם `Expenses.tsx` עודכן להשתמש בה** במקום הבדיקה inline
  הקיימת (`inventoryExpenses` filter) - כדי שלא יהיו שני מקורות אמת
  לאותה בדיקה.

**קבצים:** `src/utils/businessSettings.ts` (פונקציה חדשה),
`src/pages/Dashboard/Dashboard.tsx` (`expenses` state+listener,
`CANCELLED_STATUS`, נוסחה מתוקנת), `src/pages/Expenses/Expenses.tsx`
(שימוש בפונקציה המשותפת במקום inline).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק ב': רכיב InfoTooltip גלובלי

טרם בוצע - ממשיך מיד.
