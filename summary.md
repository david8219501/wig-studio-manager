# סיכום: קבוצה ב׳ - AssignHairModal.tsx (שיוך שיער בפועל)

## 4. עיצוב כפתור "הוסף שיוך"

הוחלף מ-`btn-secondary` קבוע עם "+" בטקסט, לאותו דפוס בדיוק כמו כפתורי
"הוסף פריט מהמלאי" ב-NewOrderWizard/RepairOrderForm/OrderDetailsPanel:
הוסר ה-"+", והמחלקה עכשיו תלוית מצב - `btn-primary` (סגול/accent) רק
כשנבחרו קוקו + כמות גרמים תקינה (`selectedItem && gramsUsed !== "" &&
!gramsExceedsStock`), אחרת `btn-secondary` (אפור).

## 5. עריכה ומחיקה של שיוך שיער בודד

**מחיקה:** `handleRemove` הקיימת הופעלה עד כה ישירות בלחיצה על "✕", בלי
שום אישור. הוחלף: הלחיצה מציבה `deletingHairIndex`, שפותח `ConfirmDialog`
(`variant="danger"`) - רק אישור בפועל קורא ל-`handleRemove` הקיימת (הלוגיקה
עצמה של החזרת המשקל/שווי למלאי לא שונתה).

**עריכה (חדש):** כפתור ✏️ לכל שורה פותח שדה כמות-גרמים inline. שמירה
(`handleSaveEditHair`):
- מחשבת `diffGrams = newGrams - oldGrams` ומעדכנת `currentWeight` ישירות
  בהפרש (`hairItem.currentWeight - diffGrams`) - לא "החזר הכל ואז הורד
  שוב".
- בודקת זמינות מול `hairItem.currentWeight + oldGrams` (המשקל שכבר "שייך"
  לשיוך הזה חוזר לחישוב הזמינות) - לא מול המלאי הנוכחי בלבד.
- `costAtTime` מתעדכן לפי קצב לגרם *נעול מהשיוך המקורי*
  (`costAtTime/oldGrams`, מוכפל בכמות החדשה) - ולא מחושב מחדש מהמחיר
  הדינמי הנוכחי של הפריט. הוחלט כך בכוונה: בקופסת שאריות המחיר לגרם
  משתנה עם הזמן (`remnantTotalValue/currentWeight`), וחישוב מחדש מהמחיר
  העדכני היה שובר את עיקרון ה"תמונת מצב" של costAtTime שכבר מתועד
  בקוד. עבור קופסת שאריות, `remnantTotalValue` על הפריט מתעדכן בהתאם
  ל-diff בעלות (לא לעלות המלאה מחדש).
- סטטוס הפריט (`available`/`depleted`) מחושב מחדש לפי הסף הקיים
  (`DEPLETED_THRESHOLD_GRAMS`) על המשקל החדש.

**קבצים:** `src/components/orders/AssignHairModal.tsx`,
`src/components/orders/AssignHairModal.css`

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - האזהרה היחידה ב-`AssignHairModal.tsx` היא על אותו
  `useEffect` קיים מראש שכבר תועד עם `react-hooks/set-state-in-effect`
  (רק עם עוד קריאות `setState` שנוספו לגוף אותו effect קיים) - לא סוג
  אזהרה חדש. שאר הבעיות בהרצת lint שייכות לקבצים שלא נגעתי בהם בקבוצה
  זו.
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל - מומלץ לבדוק ידנית: לשייך קוקו,
  לערוך את הכמות למעלה ולמטה, ולוודא שהמלאי (`currentWeight`) והעלות
  (`costAtTime`) מתעדכנים נכון בכל כיוון, כולל על קופסת שאריות.

## הערה על git status

`summary2.md`/`summary3.md`/`summary4.md` עדיין מופיעים כ-`deleted`
ממשימות קודמות - לא נגעתי בהם, נשארים מחוץ לקומיט הזה.
