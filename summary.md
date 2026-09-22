# סיכום: 4 כפתורי העתקה חדשים באתר (רכיב משותף CopyButton)

## רכיב משותף: CopyButton ✅ הושלמה (חלק מחלק א', לא commit נפרד)

נוצר `src/components/common/CopyButton.tsx`/`.css` - רכיב לשימוש
חוזר, `navigator.clipboard.writeText(text)` + משוב הצלחה (אייקון
`Check` ירוק, `--color-success`) למשך 1.5 שניות, אז חוזר לאייקון
`Copy` (lucide-react, size 14/16). `e.stopPropagation()` על הלחיצה -
נדרש כי כמה מהשימושים הם בתוך אזורים לחיצים (כותרות פאנל וכו').

שני מצבי תצוגה, לפי אם הועבר `label`:
- **אייקון-בלבד** (`label` לא הועבר) - `size=14`, `padding: 4px`,
  `border-radius: var(--radius-sm)`, הובר צבע accent + רקע accent-bg.
  לשימוש: ליד מזהה/טלפון/אימייל.
- **עם label** (`label` הועבר, למשל "העתק לשליחה") - כפתור מלא עם
  border, padding 6px 12px, `size=16`, טקסט לצד האייקון (מתחלף
  ל"הועתק" בזמן המשוב). לשימוש: כפתורי "העתק לשליחה"/"העתק סיכום".

**קבצים:** `src/components/common/CopyButton.tsx`,
`src/components/common/CopyButton.css`.

## חלק א': קטלוג מחירים מלא (Calculators.tsx) ✅ הושלמה

נוספה `buildCatalogCopyText(catalog, showProfit)` - בונה טקסט:
שם הקטלוג בשורה ראשונה, ואז שורה לכל אורך בקטלוג (`row.length ס״מ -
row.price₪`). **אם `showProfit` כבוי** - אין שורת רווח בכלל (בהתאמה
למה שמוצג בטבלה עצמה - העמודה `רווח` גם מוסתרת ב-UI כש-`showProfit`
כבוי); **אם דלוק** - כל שורה מקבלת `(רווח: ₪X)` בסוף.

כפתור `<CopyButton text={buildCatalogCopyText(catalog, showProfit)}
label="העתק לשליחה" />` נוסף לתחילת `.price-catalog-actions` בכותרת
כל כרטיס קטלוג (לפני "🔄 עדכן..."/"✏️ עריכה"/"🗑️ מחיקה").

**קבצים:** `src/pages/Calculators/Calculators.tsx` (וייבוא/יצירת
`CopyButton` המשותף, ראו מעלה).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק ב': סיכום הזמנה/חוב פתוח (OrderDetailsPanel.tsx) ✅ הושלמה

נוספה `buildOrderSummaryText(order)`: שורה ראשונה "{שם לקוחה} - {סוג
עבודה} - ₪{מחיר כולל}", ואז - אם יש חוב פתוח (`totalPrice -
paidAmount > 0`) - שתי שורות "שולם: ₪X"/"יתרה לתשלום: ₪Y"; אם אין
חוב פתוח - שורה בודדת "שולם במלואה" בלבד (בלי שורת יתרה, כמבוקש).

הכפתור נוסף לכותרת קטע "פרטי הזמנה" (הראשון בפאנל), תוך שימוש
במחלקת `.order-details-section-title-row` הקיימת - אותו דפוס עיצובי
בדיוק כמו כפתור "שיוך שיער" בקטע שמתחתיו.

**קבצים:** `src/components/orders/OrderDetailsPanel.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק ג': מזהי פריטים (HairItemDetailsPanel/ShowroomStockDetailsPanel) ✅ הושלמה

בשני הפאנלים - `<CopyButton>` (אייקון-בלבד, `title="העתקת מזהה"`)
נוסף בתוך ה-`<h2>` שבכותרת, ליד המזהה המוצג (`item.hairCode ||
item.id` / `order.showroomCode || order.id`) - מעתיק את המזהה
המוצג עצמו, לא שדה נפרד. שני ה-`h2` הפכו ל-`display: flex;
align-items: center; gap: 4px` כדי שהאייקון יתיישר נכון לצד הטקסט
(במקום ליפול לשורה חדשה/להיצמד לא-מיושר, כמו שהיה קורה עם h2 רגיל
+ תוכן inline).

**קבצים:** `src/pages/Inventory/HairItemDetailsPanel.tsx`/`.css`,
`src/pages/Inventory/ShowroomStockDetailsPanel.tsx`/`.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק ד': טלפון/אימייל לקוחה (ClientDrawer.tsx) ✅ הושלמה

השורה `dir="ltr"` שהציגה טלפון+אימייל בכותרת הפאנל פורקה ל-2 `<span
className="drawer-contact-item">` (אחד לטלפון, אחד לאימייל - השני
מותנה ב-`client.email` כמו קודם, אין שינוי בלוגיקת ההצגה) - בכל אחד
`<CopyButton>` (אייקון-בלבד) נוסף מיד אחרי הטקסט/הקישור. **כפתור
האימייל לא מוצג כשאין אימייל** - יורש את התנאי הקיים `client.email &&`
שכבר עטף את כל הבלוק (לא נוסף תנאי חדש).

נוסף CSS: `.drawer-contact-row` (flex, gap, wrap) על ה-`<p>` העוטף,
`.drawer-contact-item` (inline-flex, gap קטן) על כל span - כדי
שהאייקונים יתיישרו נכון לצד הטקסט בלי לשבור את פריסת ה-LTR הקיימת.

**קבצים:** `src/components/clients/ClientDrawer.tsx`/`.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום כללי (4 החלקים + הרכיב המשותף)

רכיב `CopyButton` משותף (2 מצבי תצוגה: אייקון-בלבד/עם label) →
קטלוג מחירים (טקסט וואטסאפ מוכן, מכבד `showProfit`) → סיכום הזמנה/
חוב פתוח → מזהי פריטי מלאי/פאות תצוגה → טלפון/אימייל לקוחה. כל
כפתור מבוסס על אותו רכיב יחיד - אין שכפול לוגיקת clipboard/משוב
הצלחה באף מקום. כל חלק עם build+lint נפרד, commit+push נפרד.
