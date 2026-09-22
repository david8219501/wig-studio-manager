# סיכום: הרחבת אזור ה-hover של InfoTooltip לכל הכותרת/הטקסט הסמוך

## הבעיה

הבועית נפתחה רק כשעומדים בדיוק על האייקון (ⓘ) הקטן - קשה לכוון
אליו. הכותרת/הטקסט הסמוך (למשל "יתרת חובות פתוחים") לא הגיבו
ל-hover בכלל, אף שהם היו לרוב ארוכים בהרבה מהאייקון.

## הפתרון

`InfoTooltip.tsx` שונה כך שהוא עצמו מרנדר את אלמנט ההורה שעוטף גם
את `label` (הכותרת/הטקסט) וגם את האייקון - לא רק את האייקון בנפרד.
כך ה-`onMouseEnter`/`onMouseLeave` (state פנימי יחיד, כמו קודם - לא
שוכפל ולא הפך ל-hook נפרד) חלים על כל האזור המורחב.

**props חדשים:**
- `label: ReactNode` (חדש, חובה) - הטקסט/הכותרת שעוטפים עם האייקון.
- `className?: string` (חדש) - מועבר לאלמנט ההורה החדש, כדי לשמר
  את מחלקות ה-CSS המקוריות של כל מקום שימוש (`stat-label`/
  `kpi-label`/`fin-title`/`dash-card-title`/`reports-title`).
- `as?: "span" | "h2" | "th"` (חדש, ברירת מחדל `"span"`) - התג של
  אלמנט ההורה, כי המקומות השונים היו בעבר `span`/`h2`/`th` נפרדים.

**מיקום הבועית נשאר ליד האייקון** (לא ליד תחילת הטקסט) - הבועית
עדיין מקוננת בתוך `.info-tooltip` (הספאן הפנימי הצמוד לאייקון,
`position: relative`), לא באלמנט ההורה החדש - האלמנט ההורה רק
מוסיף את שטח ה-hover, לא משנה את מיקום ה-`position: absolute` של
הבועית.

**CSS:** נוספה `.info-tooltip-wrapper { cursor: default; }` בלבד -
בכוונה בלי override ל-`display`, כדי לא לשבור את הפריסה הקיימת
בכל מקום שימוש (במיוחד `<th>` שחייב להישאר `table-cell`).

**8 מקומות השימוש עודכנו** - כולם עברו מהתבנית הישנה (`<span
className="...">{label}<InfoTooltip text="..." /></span>`) לקריאה
ישירה ל-`<InfoTooltip as="..." className="..." label="..."
text="..." />`, בלי wrapper נפרד:
- `Reports.tsx`: KPI "רווח משוער" (בתוך `.map` על `summaryStats` -
  רק כש-`stat.tooltip` קיים, אחרת `<span>` רגיל בלי tooltip),
  `<th>` "מאזן חודשי (₪)", `<h2>` "חובות פתוחים לפי ותק".
- `Dashboard.tsx`: `<span>` "רווח החודש", `<span>` "חובות פתוחים",
  `<h2>` "📊 התפלגות סוגי עבודה".
- `Sales.tsx`: `<span>` "יתרת חובות פתוחים", `<span>` "רווח בפועל
  (משוער)".

**קבצים:** `src/components/common/InfoTooltip.tsx`/`.css`,
`src/pages/Reports/Reports.tsx`, `src/pages/Dashboard/Dashboard.tsx`,
`src/pages/Sales/Sales.tsx`.

**בדיקות:** `npm run build` נקי (טיפוס ה-`as`/הרנדור הדינמי של
תג ה-DOM עבר type-check תקין). `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
