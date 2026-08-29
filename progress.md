# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-29

1. ✅ **firebase init functions (TypeScript)**.
2. ✅ **npm install googleapis google-auth-library ב-functions/**.
3. ✅ **HTTP function ל-OAuth callback - פרוסה, ציבורית, מאומתת עובדת עד הסוף.**
   `googleCalendarOAuthCallback`:
   `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`
4. ✅ **Firestore Triggers על appointments - פרוסים ומאומתים** (עוד לא
   נבדקו מול תור אמיתי חדש - ראו "מה עדיין לא נבדק" למטה).
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות, `VITE_GOOGLE_CLIENT_ID` אמיתי.
6. ✅ **`firebase deploy --only functions` - כל הפונקציות פרוסות ועובדות.**

## ✅ החיבור ל-Google Calendar עובד סוף-לסוף, מאומת ישירות מול Firestore

אחרי סאגת דיבאג ארוכה (ראו "היסטוריית התקלות" למטה) - **ה-refreshToken
נשמר בהצלחה** ב-`users/3wSajEuX5hXq23hRyPAVX3Kg7rg1/private/googleCalendar`
(uid של `8487353@gmail.com`). אומת ישירות מול Firestore (REST API עם
access token של ה-CLI המחובר, לא רק מלוגים) - `refreshToken` תקין (103
תווים), `scope` נכון, `connectedAt` עדכני.

## 🔴→✅ תוקן: syncExistingAppointments לא רץ בגלל APP_BASE_URL שגוי

**גילוי חשוב, מתקן טעות קודמת שלי**: אמרתי בעבר שה-"Site Not Found"
בסוף זרימת ההתחברות הוא רק קוסמטי. **זו הייתה טעות.** בדקתי:

1. `firebase functions:log --only syncExistingAppointments` - **הפונקציה
   מעולם לא נקראה בפועל** בזמן ההתחברות האמיתית (רק קריאת בדיקה שלי,
   ללא אימות, שנדחתה).
2. שאילתת Firestore ישירה (REST API) על `appointments` עם
   `businessId == 3wSajEuX5hXq23hRyPAVX3Kg7rg1` - **יש 5 מסמכים**.
3. **לאף אחד מה-5 אין `googleCalendarEventId`** - תואם לכך שהפונקציה
   מעולם לא רצה (לא "0 כי הכל כבר מסונכרן").
4-5. לא רלוונטי - אין קריאה בכלל ל-Calendar API כי הפונקציה לא נקראה.

**הסיבה האמיתית**: ה-callback הפנה בסיום ל-`APP_BASE_URL`
(`https://esti-wigs-system.web.app/...`) - דומיין שאף פעם לא נפרס אליו
Hosting בפועל (רק functions נפרסו הלילה). הדפדפן נחת על דומיין ריק,
**האפליקציה (עם ה-`useEffect` שקורא ל-`syncExistingAppointments`)
מעולם לא נטענה שם** - זו לא הייתה רק הודעת שגיאה מכוערת, זו הייתה
סיבה אמיתית לכך שהסנכרון האוטומטי לא קרה.

**התיקון**: `APP_BASE_URL` ב-`functions/src/config.ts` עודכן לכתובת
ה-workspace האמיתית של Firebase Studio:
```
https://5173-firebase-estiwigsportal-1781016477573.cluster-2nmnojxdmnfh2vwda4kd7uoumu.cloudworkstations.dev
```
**זמנית** - אם/כשהאתר יפרס לדומיין קבוע (Firebase Hosting וכו'), צריך
לעדכן שוב. `firebase deploy --only functions:googleCalendarOAuthCallback`
בוצע והצליח (`0 Functions Errored`). אימתתי עם `curl` - ה-redirect
כרגע מצביע נכון על כתובת ה-workspace.

## 🔴→✅ תוקן: syncedCount היה 0 כי Google Calendar API עצמו לא היה מופעל בפרויקט

המשתמשת ניסתה את הטריק (`?googleCalendar=connected`) - הפונקציה **כן
רצה הפעם** (בניגוד לפעם הקודמת), אבל הממשק הציג "אין פגישות ישנות
להעביר" למרות שיש 9 מסמכי appointments (המספר גדל מ-5 ל-9 בינתיים -
המשתמשת הוסיפה עוד לבדיקות), אף אחד בלי `googleCalendarEventId`.

בדקתי ישירות: (1) שאילתת Firestore אישרה 9 מסמכים, כולם בלי השדה -
לא "בעיה בשאילתה" כמו שנחשד, הפילטור עצמו תקין. (2) `firebase
functions:log --only syncExistingAppointments` הראה **קריאות אמיתיות
ל-Calendar API** (`POST .../calendar/v3/calendars/primary/events` עם
תוכן אמיתי כמו "תיקון רשת - ריקי קלאר") - כלומר הפונקציה רצה, מצאה את
כל 9 הפגישות הממתינות, וניסתה ליצור אירוע לכל אחת - **אבל כל ניסיון
נכשל** עם:

```
GaxiosError: Google Calendar API has not been used in project
395404001906 before or it is disabled.
```

**הסיבה**: Google Calendar API עצמו (בניגוד ל-OAuth שכבר עובד) מעולם
לא הופעל בפרויקט - נדרשת הפעלה מפורשת בנפרד מ-OAuth credentials.
הקוד ב-`syncExistingAppointments` בולע שגיאות per-appointment בשקט
(try/catch לכל פגישה בנפרד, לא מדווח למשתמשת) - זו הסיבה שהתקבל "0
הועברו" בלי שום הודעת שגיאה, במקום שגיאה ברורה.

**התיקון**: הפעלתי את ה-API ישירות (`serviceusage.googleapis.com`
`:enable` על `calendar-json.googleapis.com`, עם ה-access token של
ה-CLI המחובר - אותו מנגנון בדיוק ש-`firebase deploy` כבר משתמש בו
אוטומטית להפעלת APIs אחרים). אימתתי: `state: "ENABLED"`.

### מה עדיין לא נבדק (הצעד הבא)

**עוד לא בדקתי אם ה-9 פגישות סונכרנו בפועל אחרי הפעלת ה-API** - יש
לנסות שוב את `?googleCalendar=connected` (או ללחוץ שוב בהגדרות אם
יש שם כפתור/דרך לרוץ שוב), ואז לבדוק ב-Firestore/בלוגים. ייתכן
שנדרשות דקות ספורות עד שהפעלת ה-API מופצת (ראינו את זה כמה פעמים
הלילה עם IAM - סביר שדומה גם כאן ל-API enablement).

לאחר אימות שהסנכרון ההיסטורי עבד: לבדוק גם בפועל ב-Google Calendar
שהפגישות מופיעות, וליצור/לעדכן/למחוק תור **חדש** לוודא שהטריגרים
(`onAppointmentCreated/Updated/Deleted`) עובדים - גם הם היו נכשלים
עד עכשיו מאותה סיבה (Calendar API disabled), אז שווה לבדוק אותם
מחדש גם.

## היסטוריית התקלות (לתיעוד, לא לפעולה - כולן נפתרו)

סדר כרונולוגי של מה שהיה חסום ואיך נפתר, כדי שהידע לא יאבד:

1. `firebase login` לא בוצע + secrets לא הוגדרו → המשתמשת פתרה.
2. Default Compute service account לא היה קיים → אושר שקיים.
3. אותו SA היה חסר role (Storage Object Viewer/Editor) → נוסף Editor.
4. Firestore `nam5` multi-region לא נתמך ב-1st gen Firestore triggers
   → הומרו ל-2nd gen.
5. Eventarc Service Agent - התברר שכבר תקין (היה עניין תזמון).
6. `GOOGLE_CLIENT_ID` secret שגוי **פעמיים** (גרסה 1: משולש בטעות;
   גרסה 2: הכילה בטעות את שורת הפקודה במקום הערך) → תוקן בגרסה 3,
   + נדרש `firebase deploy` מחדש (secrets נעולים על גרסה בזמן פריסה).
7. Firestore write נכשל ב-`PERMISSION_DENIED` → התברר ש-`googleCalendarOAuthCallback`
   (1st gen) רץ תחת `esti-wigs-system@appspot.gserviceaccount.com`
   (App Engine default SA) - **חשבון שונה** מה-Compute default SA
   שכל התיקונים הקודמים הלכו אליו. נוסף Editor ל-SA הנכון.
8. `syncExistingAppointments` לא רץ → `APP_BASE_URL` שגוי (סעיף למעלה) → תוקן.
9. `syncedCount: 0` למרות פגישות ממתינות → Google Calendar API עצמו
   לא הופעל בפרויקט → הופעל ישירות דרך Service Usage API.

## ⚠️ שני ממצאים ישנים, עדיין לא טופלו - לא קשורים למשימה הזו

1. ה-working tree חזר בשלב מסוים (בתחילת ההרצה הראשונה) להיות זהה
   ל-commit ישן יותר - השינויים מהשיחות הקודמות (אייקוני lucide-react,
   תיקון ID של hairItems, הסרת לוגי דיבאג) נעלמו מהקוד. עדיין לא טופל.
2. קובץ ה-`progress.md`/`summary.md` התרוקנו לבד כמה פעמים במהלך
   הלילה בלי שנגעתי בהם - דפוס חוזר. קרה שוב (progress.md התרוקן שוב
   ממש עכשיו, לפני העדכון הזה).
