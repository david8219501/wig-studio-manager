# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28 - **כל 6 השלבים הושלמו בפועל, כולל פריסה מאומתת.**

1. ✅ **firebase init functions (TypeScript)** — תשתית `functions/` בנויה.
2. ✅ **npm install googleapis google-auth-library ב-functions/**.
3. ✅ **HTTP function ל-OAuth callback - פרוסה, ציבורית, ומאומתת שעובדת.**
   `googleCalendarOAuthCallback` (1st gen, us-central1):
   `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`
   אימתתי עם `curl`: בלי params → `400` עם ההודעה העברית מהקוד; עם
   code/state מזויפים → `302` ל-`.../?googleCalendar=error&reason=exchange_failed`.
4. ✅ **Firestore Triggers על appointments - פרוסים ומאומתים.**
   `onAppointmentCreated`/`onAppointmentUpdated`/`onAppointmentDeleted`
   (2nd gen, us-central1) - כל השלושה במצב `ACTIVE`, עם ה-Eventarc
   trigger שלהם ב-state `COMPLETE` (מאומת ישירות מתגובת ה-API של
   הפריסה, לא רק מ-`functions:list`). כלל ה-Firestore Rules המבוקש
   נשאר כטקסט מוצע ב-`firestore-rules-google-calendar-addition.txt`
   למיזוג ידני (לא פורסם אוטומטית - ראו הסבר למטה).
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות (`Settings.tsx`).
6. ✅ **`firebase deploy --only functions` - כל 4 הפונקציות פרוסות ועובדות.**

## סיכום כל דרך היסורים (למי שמתעניינת בפרטים)

הפריסה נכשלה 4 פעמים ברצף על 4 בעיות **נפרדות ושונות**, כולן GCP
IAM/תשתית ולא קוד:

1. `firebase login` לא היה פעיל + secrets לא הוגדרו - נפתר על ידך.
2. Default Compute Engine service account לא היה קיים בפרויקט - אישרת
   שהוא כבר קיים ומופעל.
3. אותו service account היה חסר role Editor (בעיקר Storage Object
   Viewer על bucket הבנייה הפנימי) - הוספת Editor ברמת הפרויקט.
4. מסד ה-Firestore הוא `nam5` (multi-region), ו-1st gen Cloud Functions
   לא תומך בטריגר Firestore על קונפיגורציה כזו - **תיקנתי בקוד**
   (המרתי את 3 טריגרי הסנכרון ל-2nd gen). ואז עוד בעיית IAM (Eventarc
   Service Agent) - התברר בסבב האחרון שהיא כבר הייתה מוגדרת נכון,
   וכנראה רק הייתה בעיית תזמון/הפצה (propagation) בסבב הקודם.

בנוסף תיקנתי לבד (לא דרשו תיקון IAM נוסף):
- **403 על ה-callback** אחרי סבב 3: קרה כי זו הייתה "עדכון" (UPDATE) של
  רשומת פונקציה שנשארה משובשת מניסיון קודם, לא "יצירה" אמיתית -
  Firebase CLI מגדיר גישה ציבורית (`allUsers` invoker) רק ביצירה
  ראשונה. פתרתי במחיקה ופריסה מחדש כ-CREATE אמיתי.
- **"could not set up cleanup policy"** - הודעת "Error" קוסמטית
  שהופיעה בסוף כל פריסה מוצלחת (על ניקוי אוטומטי של תמונות container
  ישנות ב-Artifact Registry, לא קשור לתקינות הפונקציות) - הרצתי
  `firebase functions:artifacts:setpolicy` כדי שלא תופיע יותר.

## מה עוד לא הושלם (לא חלק מ-6 השלבים, אבל רלוונטי)

- **`VITE_GOOGLE_CLIENT_ID` בקובץ `.env` בשורש הריפו** - עדיין לא נוצר
  (ראו `.env.example`). בלעדיו, כפתור "התחבר ל-Google Calendar" בהגדרות
  מושבת עם הודעה מתאימה. **זה מה שנשאר לפני שאפשר לבדוק את הזרימה
  המלאה מקצה לקצה בפועל (לחיצה על הכפתור → הסכמה בגוגל → חזרה עם
  refresh_token שמור).**
- **מיזוג כלל ה-Firestore Rules** (`firestore-rules-google-calendar-addition.txt`)
  בקונסולת Firebase - עדיין ידני, לא בוצע (ראו הסבר בקובץ עצמו: אין
  בריפו עותק של ה-rules הקיימים ב-production, ופריסה אוטומטית הייתה
  מסוכנת).
- **בדיקת קצה-לקצה אמיתית**: עוד לא נבדק בפועל שלחיצה אמיתית על הכפתור
  שומרת refresh_token תקין, ושיצירת/עדכון/מחיקת תור אמיתי במערכת אכן
  יוצרת/מעדכנת/מוחקת אירוע ב-Google Calendar. מה שכן אומת: הפונקציות
  קיימות, פעילות (`ACTIVE`), הטריגרים מחוברים כראוי, וה-callback מגיב
  נכון לקלט תקין ושגוי.

## ⚠️ שני ממצאים מוקדמים יותר, עדיין לא טופלו - לא קשורים למשימה הזו

1. בתחילת ההרצה הראשונה של הלילה גיליתי שה-working tree חזר להיות זהה
   ל-commit ישן יותר - השינויים מהשיחות הקודמות (מעבר לאייקוני
   lucide-react, תיקון התנגשות ה-ID של hairItems, הסרת לוגי דיבאג)
   נעלמו מהקוד. עדיין לא טופל - כדאי לבדוק, ייתכן שבאג ה-permission-denied
   ב-AddHairModal חזר.
2. קובץ ה-`progress.md` הזה עצמו התרוקן לבד (0 בייטים) כמה פעמים
   במהלך הלילה בלי שנגעתי בו - דפוס חוזר שכדאי לחקור (אולי תהליך רקע
   בסביבת Firebase Studio). לא קרה שוב בסבב האחרון, אבל שווה מעקב.
