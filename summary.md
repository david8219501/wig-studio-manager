# סיכום: אבחון + תיקון - כפתור חיבור Google Calendar לא משקף חיבור קיים

## מה מצאתי (לפני התיקון)

### 1. האם קריאה חד-פעמית או מאזין חי?
**אף אחת מהשתיים** - `Settings.tsx` **לא קורא/מאזין ל-Firestore בכלל**
לגבי סטטוס החיבור. ה-state `status` ("connected"/"error"/"unknown")
נגזר **אך ורק** מ-URL query param חד-פעמי (`?googleCalendar=connected`)
שה-OAuth callback מוסיף כשחוזרים מגוגל - ברגע שה-URL מנוקה
(`window.history.replaceState`) או שהדף נטען מחדש בביקור מאוחר יותר,
אין שום דרך לדעת שהחיבור עדיין קיים.

**חשוב עוד יותר:** הכפתור עצמו (טקסט "התחבר ל-Google Calendar") היה
**קבוע לגמרי** - שום `{isConnected ? ... : ...}`, שום תלות ב-`status`.
גם אם הייתה בדיקה תקינה, הכפתור לא היה משתנה כי אף קוד לא ניסה בכלל.

### 2. האם בודק את הנתיב/שדה הנכון?
לא בודק שום נתיב - כאמור, אין קריאת Firestore כלל בצד הלקוח.

**אבל - ממצא קריטי שמשנה את כל גישת התיקון:** מצאתי קובץ
`firestore-rules-google-calendar-addition.txt` בשורש הריפו שמתעד
**בכוונה מפורשת**: `users/{uid}/private/**` **חסום לגמרי** לקריאה/כתיבה
מצד לקוח (`allow read, write: if false`) - ה-refresh_token נגיש **רק**
ל-Admin SDK (Cloud Functions). זה גם מתועד בהערה ב-`config.ts` (שורה
28-29: "Admin SDK בלבד, לקוח לא אמור לגשת ישירות ל-path הזה").

המשמעות: **גם אם הייתי פשוט מוסיף `onSnapshot` על `users/{uid}/private/
googleCalendar` כמו שהוצע** - זה היה נכשל (permission-denied) או, גרוע
יותר, אם משום מה כן עבד - זה היה חושף בפועל את קיום ה-refresh_token
ללקוח, בניגוד מפורש לכוונת האבטחה המתועדת. **לא זו הדרך הנכונה לתקן.**

### 3. בדיקה ישירה ב-Firestore
**לא ביצעתי** - אין לי גישת Admin/MCP ל-Firestore מהסביבה הזו, ובדיקה
דרך ה-CLI (`firebase firestore:...`) לא כוללת פקודת קריאה גנרית (רק
delete/backups/indexes). ממילא זה כבר לא רלוונטי לאבחון - **מצאתי את
הבאג האמיתי בקוד עצמו** (העדר בדיקה + כפתור קבוע), לא צריך לאמת מול
production כדי לדעת שזה הגורם. אם בכל זאת תרצי לוודא שה-refresh_token
קיים בפועל אצלך - הדרך הבטוחה היא Firebase Console ידנית (Firestore
Database → `users/{ה-uid שלך}/private/googleCalendar`), לא דרכי.

## התיקון שבוצע (בהתאם לממצא #2 - לא חושף את ה-private path ללקוח)

אותו עיקרון בדיוק שכבר קיים בקוד הזה ל-`showroomCode`/`hairCode` -
**הפרדה בין הנתון הרגיש (רק Admin SDK) לשיקוף לא-רגיש שהלקוח יכול
להאזין לו חי:**

1. **`functions/src/googleCalendarAuth.ts`** - כשההתחברות מצליחה
   (כותב את ה-refresh_token ל-path הפרטי), נוסף גם כתיבת
   `googleCalendarConnected: true` (בוליאני בלבד) על `users/{businessId}`
   **הרגיל** - מסמך שהלקוח כבר קורא ממנו נתונים אחרים (businessName
   וכו', ב-App.tsx) ולכן לא חושף שום דבר חדש.

2. **`functions/src/googleCalendarStatus.ts` (קובץ חדש)** - שני
   callables חדשים:
   - `getGoogleCalendarStatus` - קוראת (Admin SDK) אם יש refresh_token,
     **ומתקנת רטרואקטיבית** (`self-heal`) את הדגל על `users/{uid}` אם
     הוא עדיין חסר - כך שגם חשבונות שהתחברו **לפני** התיקון הזה (בדיוק
     כמו שלך) מקבלים תשובה נכונה מיד בקריאה הראשונה, בלי מיגרציה ידנית.
   - `disconnectGoogleCalendar` - מוחקת את ה-refresh_token השמור
     ומאפסת את הדגל. **הערה:** זו רק "ניתוק מהצד שלנו" (מפסיקה סנכרון) -
     לא מבטלת את ההרשאה בפועל מול גוגל; אם רוצים לבטל גם שם, יש לעשות
     את זה ידנית ב-myaccount.google.com/permissions. לא היה כפתור/
     יכולת ניתוק בכלל לפני התיקון הזה - הוספתי אותה כי כפתור שקוראים
     לו "התנתק מגוגל" חייב לעשות משהו אמיתי בלחיצה.

3. **`functions/src/index.ts`** - שני ה-callables החדשים מיוצאים.

4. **`Settings.tsx`** - state חדש `isConnected` (נפרד מה-`status`
   הישן, שנשאר כמו שהוא להודעות הזמניות אחרי חזרה מגוגל):
   - קריאה חד-פעמית ל-`getGoogleCalendarStatus` ב-mount (מפעילה גם
     self-heal לחשבון שלך).
   - **מאזין חי** (`onSnapshot`) על `users/{uid}` עצמו (לא ה-path
     הפרטי!) שעוקב אחרי `googleCalendarConnected` - זה ה"מאזין חי"
     שהתבקש, רק על הנתיב הבטוח.
   - כפתור: `isConnected → "התנתק מגוגל"` (danger-styled, עם
     `ConfirmDialog` לפני ביצוע בפועל) / `!isConnected → "התחבר ל-
     Google Calendar"` (כמו היום). מוצג גם תג "✓ מחובר ל-Google
     Calendar" קבוע כשמחוברת.

**קבצים:** `functions/src/googleCalendarAuth.ts`,
`functions/src/googleCalendarStatus.ts` (חדש),
`functions/src/index.ts`, `src/pages/Settings/Settings.tsx`,
`src/pages/Settings/Settings.css`

## ✅ הפריסה בוצעה (לפי בקשה מפורשת)

`firebase deploy --only functions` הורץ ל-project `esti-wigs-system`
והסתיים בהצלחה: `getGoogleCalendarStatus`/`disconnectGoogleCalendar`
נוצרו, `googleCalendarOAuthCallback` עודכן (עם כתיבת השיקוף החדש),
ושאר הפונקציות (`onAppointmentCreated/Updated/Deleted`,
`syncExistingAppointments`) עודכנו (redeploy בלבד, בלי שינוי לוגי).
הפיצ'ר פעיל עכשיו בפרודקשן. שתי אזהרות לא-קריטיות בלוג הפריסה (Node
20 runtime deprecation ב-2026-10-30, גרסת `firebase-functions` מיושנת)
- לא קשורות לשינוי הזה, מחוץ לתחום המשימה.

## בדיקות שבוצעו

- `npm run build` בשורש (SPA) עובר נקי.
- `cd functions && npm run build` (tsc) עובר נקי - שני ה-callables
  החדשים מתקמפלים תקין.
- `npm run lint` (SPA) - אין אזהרות/שגיאות חדשות ב-`Settings.tsx`
  (האזהרה שכבר הייתה שם, על ה-effect הישן של ניתוח ה-URL, לא נגעתי
  בו). functions/ אין lint script מוגדר - הסתמכתי על `tsc` בלבד.
- **לא נבדק בפועל מול production** - צריך את הפריסה הנ"ל קודם.

## הערה על git status

`summary2.md`/`summary3.md`/`summary4.md` נוקו בסבב קודם - אין קבצי
summary ישנים מיותרים בשורש.
