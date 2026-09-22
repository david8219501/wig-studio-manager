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
