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

## מה עדיין לא נבדק (הצעד הבא)

**ה-5 פגישות הקיימות עדיין לא סונכרנו** (אין להן `googleCalendarEventId`).
כדי לתקן את זה בלי לעבור שוב על כל זרימת ה-OAuth (ה-refreshToken כבר
קיים) - שתי אפשרויות:
1. להיכנס לאפליקציה (בכתובת ה-workspace למעלה) ולהוסיף ידנית
   `?googleCalendar=connected` ל-URL, לרענן - זה יפעיל את אותו קוד
   קליינט שהיה אמור לרוץ בסוף ההתחברות, ויקרא ל-`syncExistingAppointments`.
2. או לעבור שוב על זרימת ההתחברות המלאה עכשיו שה-redirect תוקן.

אחרי זה - לבדוק בפועל ב-Google Calendar שה-5 פגישות (חיילי קלאר,
ריקי קלאר, הילה הדס) אכן מופיעות. וגם: ליצור/לעדכן/למחוק תור **חדש**
ולוודא שהטריגרים (`onAppointmentCreated/Updated/Deleted`) עובדים
בפועל מול Google Calendar אמיתי - זה עוד לא נבדק כלל, רק "הפונקציות
פעילות בלי שגיאה".

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

## ⚠️ שני ממצאים ישנים, עדיין לא טופלו - לא קשורים למשימה הזו

1. ה-working tree חזר בשלב מסוים (בתחילת ההרצה הראשונה) להיות זהה
   ל-commit ישן יותר - השינויים מהשיחות הקודמות (אייקוני lucide-react,
   תיקון ID של hairItems, הסרת לוגי דיבאג) נעלמו מהקוד. עדיין לא טופל.
2. קובץ ה-`progress.md`/`summary.md` התרוקנו לבד כמה פעמים במהלך
   הלילה בלי שנגעתי בהם - דפוס חוזר. קרה שוב (progress.md התרוקן שוב
   ממש עכשיו, לפני העדכון הזה).
