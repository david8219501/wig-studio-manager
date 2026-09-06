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

## 2. עיצוב מחדש "ניהול קטגוריות" + עקביות כרטיסים בהגדרות

טרם בוצע - ממשיך מיד.
