# סיכום: תיקון InfoTooltip - בועית נחתכת/מכוסה באזורים עם גלילה פנימית

## תחקור: האם תיקון createPortal בוצע קודם?

**נבדק בקוד בפועל (לא זיכרון) - לא בוצע מעולם.** ה-InfoTooltip
שהתעדכן בסשן הקודם (הרחבת אזור ה-hover) עדיין הכיל את התגובה
המפורשת "לא תלוי ב-createPortal... זו רק בועית טקסט סטטית שממוקמת
יחסית לאייקון עצמו" בראש הקובץ, וה-JSX רינדר את `.info-tooltip-bubble`
כילד מקונן רגיל בתוך `.info-tooltip` עם `position: absolute` יחסי
להורה - בלי שום `createPortal`/`document.body`. זה בדיוק הבאג
שהמשתמשת דיווחה: הבועית ב-`<th>` "מאזן חודשי" (Reports.tsx) נחתכת
כי היא מקוננת בתוך קונטיינר `overflow-x: auto` של הטבלה.

## הפתרון שמומש עכשיו

**1. `createPortal` ל-`document.body`:** הבועית לא מרונדרת יותר
כילד של `.info-tooltip` - עכשיו `createPortal(<span
className="info-tooltip-bubble".../>, document.body)`, כך שהיא
משוחררת מכל `overflow:hidden/auto` של קונטיינר אבא (הטבלה או כל
מקום אחר).

**2. מיקום חי, לא רק בפתיחה:** `iconRef` (על כפתור האייקון) +
`updatePosition()` שקוראת `getBoundingClientRect()` ומחשבת
`{top: rect.bottom + 8, left: rect.left + rect.width/2}` - נקראת גם
ב-`open()` (מיד כשנפתחת) וגם ב-`useEffect` שרשום כל עוד `isOpen`:
`window.addEventListener("scroll", updatePosition, {passive:true,
capture:true})` + `resize`. **`capture: true` על ה-scroll listener
חשוב במיוחד** - כך שהוא תופס גם גלילה של קונטיינר מקונן (כמו
`overflow-x:auto` של הטבלה), לא רק גלילת הדף/window עצמו - אירועי
scroll לא עולים (bubble) אבל התפיסה ב-capture phase תופסת אותם בכל
מקרה. הליסנרים מוסרים אוטומטית כשה-bubble נסגרת (`isOpen` false)
או ב-unmount.

**3. `position: fixed` בבועית עצמה** (לא `absolute`) - כי היא
מרונדרת כילד ישיר של `body` עכשיו, ו-`getBoundingClientRect()` כבר
מחזיר קואורדינטות יחסיות ל-viewport - אין צורך להוסיף
`scrollX`/`scrollY` בעצמנו. `top`/`left` עוברים כ-inline style
(דינמיים, לא ניתנים ל-CSS class סטטי); `transform: translateX(-50%)`
נשאר ב-CSS - ממרכז את הבועית מתחת לאייקון (ה-`left` המחושב הוא
מרכז האייקון).

**`.info-tooltip` (הספאן הפנימי הצמוד לאייקון) הפשיט את
`position: relative`** - לא נחוץ יותר, הבועית לא ילד יחסי שלו.

## בדיקת 7 המקומות האחרים

**כל 8 מקומות השימוש עוברים דרך אותו רכיב `InfoTooltip` יחיד** -
נבדק ב-`grep -rn "InfoTooltip" src/` שאין שום מימוש נפרד/משוכפל של
בועית הסבר באתר. התיקון ב-`InfoTooltip.tsx` חל אוטומטית על כולם -
לא נדרש תיקון נפרד בכל מקום.

**קבצים:** `src/components/common/InfoTooltip.tsx`/`.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
