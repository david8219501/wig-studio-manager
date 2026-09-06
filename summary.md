# סיכום: ליטוש עיצובי מקיף לקראת פרסום ציבורי

## שלב 1: ביקורת עקביות ✅ הושלמה (דיווח בלבד, ללא תיקון)

בדיקה שיטתית (grep) על כל 24 קבצי ה-CSS באתר, לפי 5 הקטגוריות
שהתבקשו. תקציר הממצאים (הדוח המלא נמסר בצ'אט):

1. **border-radius** - כמעט מושלם. מעל 150 מופעים כבר עוברים דרך
   `var(--radius-sm/md/lg/xl/pill)`. חריגים זניחים בלבד: פולבקים
   שרידיים לא-תואמים ב-`var(--radius-sm, 4px)`/`var(--radius-sm, 6px)`
   (Inventory.css/Login.css), ו-`border-radius: 2px` בודד לנקודת
   legend דקורטיבית (Calculators.css - לא שווה טוקן ייעודי).
2. **צבעים** - 3 בעיות אמיתיות: (א) רקעי אוברליי של 10 מודלים שונים
   ב-4 ערכי שקיפות שונים (`0.3`/`0.4`/`0.45`/`0.55`) לאותו רעיון
   בדיוק; (ב) פולבקים שרידיים `var(--color-danger, #d33)`/
   `var(--color-danger-bg, #fef2f2)` ב-8 קבצים - `#d33` אפילו לא
   תואם את `--color-danger` האמיתי (`#ef4444`); (ג) `rgba(155,105,255,
   0.25)` ב-Clients.css - זה בדיוק `--color-accent` בפירוק RGB, בלי
   טוקן. (הצבע `#25d366` ל-WhatsApp ב-ClientDrawer.css מתועד במפורש
   כחריגה מכוונת - לא בעיה.)
3. **ריווח** - סולם `--space-1..10` קיים ב-index.css אך **בשימוש
   אפס פעמים** בכל הקוד. בפועל ה-spacing כבר עוקב אחרי קצב סביר
   (בעיקר כפולות 2/4). הבעיה הקונקרטית היחידה: padding חיצוני של
   עמוד מתחלק ל-3 ערכים שונים (`32px 36px` / `24px` / `32px`).
4. **hover/focus** - 3 מוקדים ממשיים: `ConfirmDialog.css` (המודל
   המשותף לכל אישורי מחיקה!), `RepairOrderForm.css`, וטבלת הדוחות
   החודשית (`Reports.css`) - היחידה מכל טבלאות האתר בלי `tr:hover`.
   בבדיקה מעמיקה יותר בשלב 2 התגלה שאותו פער (`.btn-primary`/
   `.btn-secondary` בלי hover) חוזר גם ב-`OrderDetailsPanel.css`,
   `AssignHairModal.css`, ו-`NewOrderWizard.css`.
5. **טיפוגרפיה** - כותרות עמוד (h1) לא עקביות: 30px/700 (Dashboard),
   28px/700 (Calendar), 28px/600 (Clients), 26px/600 (Expenses),
   26px/500 (Inventory) - מול 28px/500 (Sales/Reports/Calculators,
   שכבר תואמים לברירת המחדל הגלובלית ב-`index.css`). כותרות כרטיס
   (`.dash-card-title`/`.reports-title`=700 מול `.calc-card-title`=500)
   - אותה סטייה בתת-רמה.

## שלב 2: תיקון גורף ✅ הושלמה

### הרחבת משתני העיצוב (`index.css`)
נוספו 4 טוקנים חדשים, כל אחד מרכז ערך שהיה מפוזר בקבצים רבים:
- `--shadow-focus-ring: 0 0 0 3px var(--color-accent-bg);` - היה
  מפוזר זהה ב-**12 קבצים**.
- `--color-overlay: rgba(0, 0, 0, 0.4);` - מאחד את 4 ערכי השקיפות
  השונים שהיו ב-**11 מודלים**, לערך אחיד אחד.
- `--shadow-accent-sm: 0 2px 8px rgba(155, 105, 255, 0.25);` - צל
  accent (Clients.css) שהיה rgba גולמי.
- `--page-padding: 32px 36px;` - padding חיצוני אחיד לכל 9 דפי
  האפליקציה (במקום 3 ערכים שונים - Inventory/Settings/Expenses/
  Calculators עברו מ-24px ל-32px 36px, שינוי ויזואלי מכוון).

### ניקוי פולבקים שרידיים
`var(--color-danger, #d33)` → `var(--color-danger)`,
`var(--color-danger-bg, #fef2f2)` → `var(--color-danger-bg)`,
`var(--radius-sm, 4px/6px)` → `var(--radius-sm)` - ב-7 קבצים
(AssignHairModal/OrderDetailsPanel/Inventory/NewOrderWizard/
RepairOrderForm/Login/Settings). לא באג פעיל (המשתנה תמיד מוגדר)
אלא ניקוי שרידים לא-תואמים.

### תיקון transition לא-אחיד
`Clients.css` היה הקובץ היחיד באתר עם `transition: X 0.2s` גולמי
(4 מופעים) במקום `var(--duration-fast) var(--easing)` - תוקן.

### עקביות טיפוגרפית
כל כותרות העמוד (h1) אוחדו ל-**28px / `var(--font-weight-heading)`
(500)**, תואם לברירת המחדל הגלובלית וגם לרוב (Sales/Reports/
Calculators): Dashboard (30px/700→28px/500), Expenses (26px/600→
28px/500), Inventory (26px/500→28px/500), Calendar (28px/700→
28px/500), Clients (600→500, גודל כבר תקין). **Login נשאר בכוונה
32px/700** - חריגה מתועדת: מסך כניסה/הרשמה, לא עמוד פנימי של
האפליקציה. כותרות כרטיס אוחדו ל-**700** (הרוב): `.calc-card-title`
עלה מ-500 ל-700 כדי לתאום את `.dash-card-title`/`.reports-title`.

### hover states חסרים - 6 קבצים
נוסף `:hover` (+ `transition`) לכל מקום שנמצא חסר:
- `ConfirmDialog.css` - `.btn-secondary`→`background: var(--color-
  surface-hover)`, `.confirm-dialog-confirm-btn`→`opacity: 0.88`.
- `RepairOrderForm.css`, `AssignHairModal.css`, `NewOrderWizard.css`,
  `OrderDetailsPanel.css` - אותו זוג `.btn-primary`/`.btn-secondary`
  חוזר על עצמו ב-4 הקבצים, עם אותו טיפול (`opacity:0.88`/
  `background: var(--color-surface-hover)`) - הדפוס הקיים כבר
  ב-`Inventory.css`/`Calendar.css`.
- `Reports.css` - נוסף `.reports-table tbody tr:hover` (היחידה בלי
  זה מכל טבלאות האתר).

### קבצים שהשתנו (שלב 2)
`index.css`, `ConfirmDialog.css`, `RepairOrderForm.css`,
`AssignHairModal.css`, `NewOrderWizard.css`, `OrderDetailsPanel.css`,
`ClientDrawer.css`, `AddClientModal.css`, `Reports.css`, `Clients.css`,
`Inventory.css`, `ShowroomStockDetailsPanel.css`, `Expenses.css`,
`Calendar.css`, `Settings.css`, `Login.css`, `Calculators.css`,
`Dashboard.css`, `Sales.css`.

### מה נשאר מחוץ לתחום (במכוון)
- מיגרציה מלאה של כל ה-spacing (padding/gap) ל-`var(--space-N)` -
  מאות מופעים, סיכון גבוה בלי כלי בדיקה ויזואלית זמין בסביבה הזו.
  מומלץ כסבב נפרד עתידי.
- פערי padding קטנים בכפתורי `.btn-primary`/`.btn-secondary`
  (10px 20px מול 10px 18px) - הבדל של 2px, לא משמעותי ויזואלית.
- `Header/Header.tsx`+`Header.css` ריקים ולא מיובאים בשום מקום -
  קובץ מת, לא קשור לעקביות עיצובית (לא נמחק - לא התבקש).

### בדיקות
`npm run build` נקי. `npm run lint` - 24 בעיות, זהה לבייסליין
הקבוע (שינויי CSS בלבד, אין קוד TS/TSX חדש בשלב הזה).

**הערה:** לא ניתן היה לבדוק ויזואלית בדפדפן בסביבה הזו (אין כלי
אוטומציית דפדפן זמין) - כל השינויים אומתו דרך build+lint נקיים
וסקירת קוד קפדנית (grep ממוקד לפני ואחרי כל שינוי), לא צילומי מסך.

## שלב 3: בדיקת רספונסיביות בסיסית (בתהליך)

טרם בוצע - ימשיך מיד.
