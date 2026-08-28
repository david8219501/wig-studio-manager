# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28 - **כל 6 השלבים המקוריים הושלמו + פיצ'ר סנכרון היסטורי חדש, הכל פרוס ומאומת.**

1. ✅ **firebase init functions (TypeScript)**.
2. ✅ **npm install googleapis google-auth-library ב-functions/**.
3. ✅ **HTTP function ל-OAuth callback - פרוסה, ציבורית, מאומתת.**
   `googleCalendarOAuthCallback`:
   `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`
4. ✅ **Firestore Triggers על appointments - פרוסים ומאומתים.**
   `onAppointmentCreated`/`onAppointmentUpdated`/`onAppointmentDeleted` (2nd gen).
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות, עם
   `VITE_GOOGLE_CLIENT_ID` אמיתי ב-`.env` (לא מושבת יותר).
6. ✅ **`firebase deploy --only functions` - כל הפונקציות פרוסות ועובדות.**

## חדש: פיצ'ר סנכרון היסטורי אוטומטי (syncExistingAppointments)

נוספה פונקציה חמישית, **callable** (לא trigger): `syncExistingAppointments`
(`functions/src/syncExistingAppointments.ts`, 2nd gen, us-central1).

- **מה היא עושה**: מקבלת את uid העסק מ-`request.auth` (Firebase Auth
  context אוטומטי בקריאה callable), שולפת את ה-refresh token שלו
  (מחזירה שגיאת `failed-precondition` ברורה אם העסק לא חיבר Google
  Calendar), שולפת את כל `appointments` שלו, מסננת בזיכרון רק את אלה
  **בלי** `googleCalendarEventId` (Firestore לא תומך בשאילתת "שדה לא
  קיים"), ויוצרת לכל אחת אירוע ביומן - **דרך אותה פונקציית עזר משותפת
  בדיוק** שהטריגר `onAppointmentCreated` (ו-`onAppointmentUpdated`
  בנתיב היצירה-מחדש שלו) כבר משתמשים בה: `createCalendarEventForAppointment`
  (חולצה החוצה ב-`googleCalendarSync.ts` ומיוצאת משם, בדיוק כדי שלא
  תהיה נוסחת יצירת-אירוע כפולה בשלושה מקומות). מחזירה `{ syncedCount }`.
- **בטוחה מהרצה כפולה**: מסננת רק מסמכים בלי `googleCalendarEventId` -
  פגישות שכבר סונכרנו (בין אם ע"י הטריגר על פגישה חדשה, ובין אם ע"י
  סנכרון היסטורי קודם) פשוט מדולגות, לא נוצרות כפילות ביומן.
- **הפעלה אוטומטית בממשק** (`Settings.tsx`): ברגע שה-`useEffect` שבודק
  את ה-query params מזהה `googleCalendar=connected` (לא `success` -
  זה הערך שה-callback באמת שולח, ראו `googleCalendarAuth.ts`), הוא
  קורא מיד ל-`syncExistingAppointments()` דרך ה-Functions client SDK
  (`httpsCallable`), מציג "מסנכרן פגישות קיימות..." בזמן הריצה, ובסיום
  "הועברו N פגישות ליומן" (או "אין פגישות ישנות להעביר" אם 0). בכישלון
  - הודעה נפרדת שלא חוסמת/מוחקת את הודעת ההצלחה של החיבור עצמו.
- **צד לקוח**: נוסף `functions` (מ-`firebase/functions`, region
  `us-central1` - חייב להתאים ל-`REGION` ב-`functions/src/config.ts`)
  ל-`src/services/firebase.ts`, לצד `auth`/`db` הקיימים.

### פריסה ואימות

`firebase deploy --only functions:syncExistingAppointments` - הצליחה
במלואה (`state: ACTIVE`, `0 Functions Errored`). אימתתי בעצמי עם
`curl` (POST ללא אימות): התקבל
`{"error":{"message":"יש להתחבר למערכת כדי לסנכרן פגישות.","status":"UNAUTHENTICATED"}}` -
בדיוק ההודעה העברית מהקוד שלי, לא שגיאת מסגרת גנרית - הוכחה שהפונקציה
באמת רצה ומריצה את הלוגיקה שכתבתי, לא רק קיימת כרשומה.

`npm run build` (גם השורש וגם `functions/`) עובר נקי.

## מה עדיין לא נבדק (קצה-לקצה אמיתי מול Google)

עוד לא בוצעה בדיקה מלאה: לחיצה אמיתית על "התחבר ל-Google Calendar" →
אישור בגוגל → חזרה עם `googleCalendar=connected` → הרצה אוטומטית של
`syncExistingAppointments` → בדיקה בפועל שפגישות ישנות אכן הופיעו
ב-Google Calendar. כל מה שאומת עד כה הוא ברמת "הפונקציות פעילות
ומריצות את הקוד הנכון" - לא עוד "עובד בפועל מול Google Calendar אמיתי".

## ⚠️ שני ממצאים ישנים, עדיין לא טופלו - לא קשורים למשימה הזו

1. ה-working tree חזר בשלב מסוים (בתחילת ההרצה הראשונה של הלילה)
   להיות זהה ל-commit ישן יותר - השינויים מהשיחות הקודמות (אייקוני
   lucide-react, תיקון ID של hairItems, הסרת לוגי דיבאג) נעלמו מהקוד.
   עדיין לא טופל.
2. קובץ ה-`progress.md`/`summary.md` התרוקנו לבד כמה פעמים במהלך
   הלילה בלי שנגעתי בהם - דפוס חוזר שכדאי לחקור. לא קרה בסבב האחרון.
