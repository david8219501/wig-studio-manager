# סיכום: "החזר ללקוחה" יוצר גם הוצאה (expenses) ✅ הושלמה

## הבעיה
`handleConfirmRefund` (`ClientDrawer.tsx`) הפחית `creditBalance`
ורשם `creditHistory` שלילי, אבל לא רשם שום `expense` - כסף אמיתי
שיוצא מהעסק לא נראה בדשבורד/דוחות בכלל.

## התיקון

1. **הוצאה חדשה** (`addDoc` ל-`expenses`) בכל החזר: `amount`
   (סכום ההחזר), `category: "החזרים ללקוחות"` (קבוע חדש
   `REFUND_EXPENSE_CATEGORY`), `description: "החזר ללקוחה - {שם}"`,
   `date` (תאריך ההחזר), `businessId`, + `supplier`/`paymentMethod`/
   `status` (שדות חובה בטיפוס `Expense` הקיים ב-`Expenses.tsx`) -
   `supplier: client.name`, `paymentMethod: "cash"`, `status: "paid"`
   - אותו דפוס בדיוק כמו `createInventoryExpense` הקיים ב-`Inventory.tsx`.

2. **קטגוריה חדשה** `REFUND_EXPENSE_CATEGORY = "החזרים ללקוחות"`
   (`src/utils/businessSettings.ts`) - נוספה גם ל-`DEFAULT_EXPENSE_CATEGORIES`
   (זרע ברירת מחדל לעסקים חדשים). **וגם** מובטח לעסק **הקיים** בפועל:
   בכל החזר, `setDoc(businessSettings/{uid}, {expenseCategories:
   arrayUnion(REFUND_EXPENSE_CATEGORY)}, {merge:true})` - `arrayUnion`
   אידמפוטנטי (לא כופל אם כבר קיימת), `setDoc(merge:true)` במקום
   `updateDoc` כדי שיעבוד גם אם `businessSettings/{uid}` עדיין לא
   קיים בכלל (לא רק תיאורטי - זה תרחיש אמיתי לעסק חדש).

3. **לא נכלל ב"הוצאות מלאי וספקים":** `isInventoryExpenseCategory`
   (הפונקציה המשותפת מהתיקון הקודם היום) בודקת רק `"inventory"`/
   `"מלאי ושיער"` - `"החזרים ללקוחות"` **לא** תואם, ולכן מסתכם
   אוטומטית תחת הוצאות התפעול/שיווק הכלליות. **השפעה נכונה על "רווח
   החודש" בדשבורד** (שכבר מחסיר רק הוצאות תפעול, לא מלאי, מהתיקון
   הקודם היום) - הוצאה חדשה בחודש הרלוונטי תוריד את "רווח החודש"
   בהתאם, נכון.

**קבצים:** `src/components/clients/ClientDrawer.tsx` (imports
`addDoc`/`setDoc`, `handleConfirmRefund` מורחב), `src/utils/businessSettings.ts`
(`REFUND_EXPENSE_CATEGORY` חדש + נוסף ל-`DEFAULT_EXPENSE_CATEGORIES`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
