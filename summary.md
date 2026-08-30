# סיכום: 4 שינויים לפיצ'ר "פאות תצוגה"

## 1. תיקון באג מיקום - החלפת `<select>` מובנה ב-CustomSelect

`ShowroomStockFormModal.tsx` השתמש ב-3 שדות `<select>` מובנים (אורך/
מבנה/מלאות) - אותו באג ידוע כבר (נפתח בראש הדף, לא צמוד לשדה, בעיקר
בלינוקס). הוחלפו ל-`CustomSelect` (`src/components/common/CustomSelect.tsx`)
עם `options` בנויים מ-`HAIR_LENGTH_OPTIONS`/`STRUCTURE_OPTIONS`/
`FULLNESS_OPTIONS` הקיימים ב-`hairCost.ts`.

## 2. usedBulkItems לפאת תצוגה

נוסף `src/pages/Inventory/AssignBulkItemsModal.tsx` (חדש) - אותה
יכולת "הוסף פריט מהמלאי" בדיוק כמו ב-`NewOrderWizard`/`OrderDetailsPanel.tsx`
(itemId/itemName/quantity/unitCostAtTime, מוריד כמות בפועל מ-`bulkItems`,
עם וולידציית מלאי זהה). נפתח מכפתור "📦 ניהול פריטי מלאי" חדש בטבלת
"פאות תצוגה". "עלות מחושבת" בטבלה כוללת עכשיו גם `usedBulkItems` (לא
רק `usedHairItems`). מחיקת פאת תצוגה (`performDeleteShowroomOrder`
ב-`Inventory.tsx`) עודכנה להחזיר גם כמויות `usedBulkItems` למלאי (לא
רק משקל שיער) - מקובץ לפי `itemId` כמו קודם, כדי לא לדרוס עדכונים
אם אותו פריט שויך כמה פעמים.

## 3. מזהה ידידותי (SHOWROOM-1001 וכו')

נוסף שדה חדש `showroomCode` (ב-`orderCreation.ts`, `NewOrderInput`/
`createOrder`). מחושב ב-`Inventory.tsx` (`nextShowroomCode`) מכל
ה-`orders` עם `isShowroomStock` - **כולל כאלה שכבר נמכרו**, לא רק
`showroomOrders` (הלא-נמכרות), כדי שהמספור לא יתאפס/יתנגש אחרי מכירה.
בשונה מ-`nextHairId`, אין כאן סיכון התנגשות בין-עסקית: זה שדה מידע
בלבד, לא ה-ID של המסמך עצמו (ש-Firestore יוצר אוטומטית תמיד). מוצג
בעמודה נפרדת "מזהה" בטבלת "פאות תצוגה", ובטופס היצירה/עריכה.

## 4. סטטוס בנייה ניתן לעריכה

נוסף שדה חדש `showroomStatus` (טיפוס `ShowroomBuildStatus` -
"בבנייה"/"בטיפול"/"ממתינה לגימור"/"מוכנה", ב-`orderCreation.ts`) -
**נפרד** מ-`Order.status` הרגיל (workflow של הזמנת לקוחה) כדי לא
"לזהם" את הטיפוס/הבדג'ים הקיימים ב-Sales.tsx עם ערכים לא-רלוונטיים.
ברירת מחדל "בבנייה" ביצירה. עדכון אוטומטי ל"מוכנה" כששויך שיער ראשון
בפועל - מיושם כ-`useEffect` ב-`Inventory.tsx` שצופה ב-`orders` (לא
בתוך `AssignHairModal` עצמו, שנשאר גנרי וללא שינוי): מעדכן ל"מוכנה"
רק כשעדיין "בבנייה" (ברירת המחדל) ויש `usedHairItems` - כך שלא דורס
בחירה ידנית קודמת. ניתן לשינוי ידני בכל רגע דרך `CustomSelect` ישירות
בטבלת "פאות תצוגה" (לא כפול גם בטופס העריכה - מקום אחד ברור מספיק).
בעת מכירה בפועל (`SellShowroomStockModal.tsx`, מסבב קודם) - `status`
הרגיל נדרס ל-"delivered" כרגיל; `showroomStatus` נשאר לתיעוד היסטורי.

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות; `AssignBulkItemsModal.tsx`
  החדש מציג את אותה אזהרת `react-hooks/set-state-in-effect` הקיימת כבר
  ב-`AssignHairModal.tsx` (הדפוס עצמו, לא בעיה חדשה).
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל (מיקום נכון של ה-CustomSelect
  בטופס, הוספת/הסרת פריטי מלאי, מספור SHOWROOM-1001 רציף, מעבר סטטוס
  אוטומטי+ידני) - מומלץ לבדוק ידנית לפני סמיכה מלאה.
