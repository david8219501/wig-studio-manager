# סיכום: 2 שיפורי עיצוב - דף מלאי שיער ודף הגדרות

## 1. פישוט טבלת "מלאי שיער ייחודי" - אותו טיפול כמו Sales.tsx ✅ הושלמה

הטבלה צומצמה מ-11 עמודות ל-5 (מזהה/גוון/אורך/משקל נוכחי/סטטוס) -
לחיצה על שורה (`cursor: pointer`, `.hair-row`, אותו דפוס כמו
`.showroom-row`) פותחת פאנל פרטים נשלף חדש - `HairItemDetailsPanel.tsx`
(+ `HairItemDetailsPanel.css` עצמאי) - אותו דפוס עיצובי מדויק כמו
`ShowroomStockDetailsPanel.tsx`/`OrderDetailsPanel.tsx` (overlay +
פאנל קבוע מהצד, אנימציית slide-in).

**הפאנל מציג:** כל שאר הפרטים (ספק, אורך, משקל התחלתי, מרקם, סוג
שיער, עלות רכישה/מחיר ממוצע לגרם לקופסת שאריות) + badge סטטוס בכותרת
(שימוש חוזר ב-`.status-badge`/`.status-available` וכו' הגלובליים,
בלי CSS חדש). לוגיקת המיזוג נשארת ב-`Inventory.tsx` - הפאנל רק מעביר
הלאה (`onMerge`/`onViewMergeLog`), בדיוק כמו `onOpenAssignHair` ב-
`ShowroomStockDetailsPanel`.

**"עריכה" - פיצ'ר חדש (לא היה קיים בכלל לפני):** `AddHairModal.tsx`
קיבל `editingItem` prop, באותו דפוס בדיוק כמו `AddBulkItemModal.tsx`
הקיים. **אורך/משקל התחלתי לא ניתנים לעריכה במכוון** (מוסתרים מהטופס
בעריכה) - הם משפיעים על חישובי משקל/שארית שכבר בתוקף על הפריט
(`currentWeight`/`remnantTotalValue`), ועריכה שקטה שלהם הייתה יוצרת
אי-עקביות (אותו טיעון בדיוק כמו למה `AddBulkItemModal` לא נותן לערוך
`quantity`). שמירת עריכה משתמשת ב-`updateDoc` על השדות התיאוריים
בלבד (לא `setDoc`+הוצאת רכישה - זו לא קנייה חדשה).

**"מכירה אם רלוונטי" - הוחלט לא להוסיף:** `HairItem['status']` כולל
ערכי `'showroom'`/`'sold'`, אבל grep מלא הראה שאף מקום בקוד לא מגדיר
סטטוס כזה בפועל על hairItems רגילים היום - "מכירה" אף פעם לא רלוונטית
בפועל לפריט הזה כרגע, אז אין תרחיש חי שמצדיק את הכפתור.

**תיקון lint לאורך הדרך:** ה-`useEffect` הראשוני שמילא את הטופס
בעריכה (`setForm` בתוך effect לפי `editingItem`) יצר שגיאת
`react-hooks/set-state-in-effect` אמיתית - **תוקן** לא ע"י העתקת
הדפוס הישן (הלא-מתוקן) שכבר קיים ב-`AddBulkItemModal.tsx`/עוד 6
קבצים, אלא בגישה נקייה יותר: אתחול `useState` ישירות מ-`editingItem`
(lazy initial state) + `key={editingHairItemId ?? 'new'}` על הקריאה
ב-`Inventory.tsx`, שגורם ל-React למחזר (remount) את כל הרכיב בכל
פעם שיעד העריכה משתנה - בלי effect בכלל.

**ניקוי אגב:** הוסרו `.merge-remnant-btn`/`.merge-log-btn` מ-
`Inventory.css` - הפכו ל-CSS מת אחרי שהכפתורים עברו לפאנל.

**אזור הפילטרים:** נבדק - כבר כרטיס אחיד עם ריווח/יישור עקבי
(`flex-wrap`, `gap`, `padding`/`border-radius`/`shadow` אחידים,
תואם לדפוס הקיים בדפים אחרים) - **לא שונה**, לא נמצא שינוי שתורם
בפועל.

**קבצים:** `Inventory.tsx`, `Inventory.css`, `AddHairModal.tsx`,
`HairItemDetailsPanel.tsx` (חדש), `HairItemDetailsPanel.css` (חדש).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## 2. עיצוב מחדש "ניהול קטגוריות" + עקביות כרטיסים בהגדרות ✅ הושלמה

### תגיות ("pills") קומפקטיות
`.settings-category-list` עבר מ-`flex-direction: column` (שורה מתחת
לשורה, רוחב מלא) ל-`flex-direction: row; flex-wrap: wrap;` - התגיות
נשברות לשורה הבאה כשנגמר מקום, לא נשארות ברוחב מלא. `.settings-
category-chip` עבר מ-`display:flex` + מסגרת מלאה (`border: 1px solid
var(--color-border)`, `border-radius: var(--radius-md)`) ל-`display:
inline-flex` + עיצוב עגול לגמרי (`border-radius: var(--radius-pill)`)
+ רקע עדין (`var(--color-background)`) **בלי מסגרת בכלל**. כפתור ה-X
בפנים קיבל צורת עיגול קטן (18px, `border-radius:50%`) עם hover
אדמדם (`var(--color-danger-bg)`/`var(--color-danger)`) במקום רק שינוי
צבע טקסט.

### עקביות כרטיסים - ממצא ותיקון ארכיטקטוני
**גילוי:** כל 7 האזורים בדף (פרופיל עסק/קטגוריות/תמחור/גיבוי/Google
Calendar/ניהול חשבון/אזור מסוכן) כבר השתמשו במחלקה **משותפת**
(`placeholder-card`) - אז הם כבר היו זהים ב-padding/border-radius/
shadow/border. אבל המחלקה הזו הייתה **מוגדרת ב-`App.css` הגלובלי**
תחת שם גנרי-שרידי (`placeholder-card`, כמו scaffold זמני), למרות
שהיא בשימוש **אך ורק** ב-`Settings.tsx` (אומת ב-grep) - סתירה ישירה
למוסכמת הפרויקט המתועדת ב-CLAUDE.md ("קובץ CSS אחד לכל דף/רכיב,
קו-לוקייטד").

**תיקון:** המחלקה הועברה מ-`App.css` ל-`Settings.css` ושונה שם
ל-`.settings-card` (עקבי עם `.calc-card`/`.dash-card`/`.reports-card`
בדפים אחרים). כל 7 המופעים ב-`Settings.tsx` עודכנו. `.google-
calendar-card`/`.settings-danger-zone` ממשיכים לדרוס רק צבע/מסגרת
(לא נגעו ב-padding/radius/shadow המשותפים) - "אזור מסוכן" נשאר מובחן
כמבוקש, לא שונה.

**נוסף גם:** כותרת-פנימית אחידה - מחלקה חדשה `.settings-card-title`
(עם `border-bottom` מפריד מתחת לכותרת) הוחלה על כל 7 ה-`<h2>`, אותו
דפוס בדיוק כמו `.calc-card-header` ב-Calculators.css - כדי שכל כרטיס
ייקרא בבירור כ"כותרת + גוף" ולא כותרת צפה בלי הפרדה. באזור המסוכן,
קו ההפרדה עצמו אדמדם (`border-bottom-color: var(--color-danger)`)
כדי לתאום את הצבע האדום הקיים של האזור.

**קבצים:** `App.css` (הוסרה ההגדרה הישנה), `Settings.css` (הוגדרה
מחדש בשם `.settings-card`/`.settings-card-title`, עודכנו כללי
ה-chips), `Settings.tsx` (7 מופעי className + 7 מופעי `<h2>`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
