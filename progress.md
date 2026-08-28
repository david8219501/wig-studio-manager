# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28

1. ✅ **firebase init functions (TypeScript)** — תשתית `functions/` בנויה.
2. ✅ **npm install googleapis google-auth-library ב-functions/** — הותקנו,
   `npm run build` (tsc) עובר נקי.
3. ✅✅ **HTTP function ל-OAuth callback - פרוסה בפועל ומאומתת עובדת!**
   `googleCalendarOAuthCallback` (1st gen, us-central1) חיה ב:
   `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`
   אימתתי בעצמי עם `curl`: בלי query params מחזירה `400` עם ההודעה
   העברית הנכונה מהקוד; עם `code`/`state` פיקטיביים מחזירה `302 redirect`
   ל-`https://esti-wigs-system.web.app/?googleCalendar=error&reason=exchange_failed`
   (בדיוק ההתנהגות הצפויה - code מזויף נכשל בהחלפה מול גוגל). זו לא
   רק "קיימת ב-functions:list" - זו התנהגות אמיתית של הקוד שכתבתי.
4. ⏳ **Firestore Triggers על appointments - קוד עודכן, פריסה עדיין
   חסומה על בעיית IAM חדשה (Eventarc).** פירוט מלא למטה.
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות (`Settings.tsx`).
6. ⏳ **הפריסה חלקית: הפונקציה החשובה ביותר (ה-callback) פרוסה ועובדת.
   שלוש פונקציות הסנכרון עדיין לא.**

## מה קרה בסבב הזה (אחרי שהוספת role Editor ל-service account, ברמת הפרויקט)

1. ✅ ה-build עצמו כבר לא נכשל (בעיית ה-bucket permission מהסבב הקודם
   נפתרה לגמרי בזכות ה-Editor role).
2. ✅ **`googleCalendarOAuthCallback` נוצרה בהצלחה** - אבל בפריסה
   הראשונה בסבב הזה היא חזרה `403 Forbidden` ב-curl (לא ציבורית).
   גיליתי שזה קרה כי הפעם זו הייתה "עדכון" (UPDATE) של רשומת פונקציה
   שנשארה משובשת מניסיון קודם, לא "יצירה" (CREATE) אמיתית - ו-Firebase
   CLI מגדיר גישה ציבורית (`allUsers` invoker) רק בפעם הראשונה שפונקציה
   https נוצרת, לא בעדכונים. **פתרתי בעצמי:** מחקתי את הפונקציה
   (`firebase functions:delete googleCalendarOAuthCallback --force`)
   ופרסתי אותה מחדש לבד (`firebase deploy --only functions:googleCalendarOAuthCallback`)
   - הפעם כ-CREATE אמיתי, וה-CLI כן הגדיר `allUsers`/`roles/cloudfunctions.invoker`
   כמו שצריך. אימתתי עם curl (ראו שלב 3 למעלה) - עובד.
3. ❌ **שלוש פונקציות הסנכרון (`onAppointmentCreated/Updated/Deleted`)
   נכשלו על שגיאה חדשה**, לא קשורה ל-bucket permission:
   ```
   Resource projects/esti-wigs-system/databases/(default)/documents/appointments/{appointmentId}
   is in region nam5-us-central1 which is not supported
   ```
   **הסיבה:** מסד ה-Firestore של הפרויקט הוא ב-`nam5` (multi-region ארה"ב).
   זו מגבלה ידועה: Cloud Functions **1st gen** לא תומכות בטריגר Firestore
   על מסד multi-region כזה מול region `us-central1`. **תיקנתי בקוד** -
   העברתי את שלוש הפונקציות האלה מ-1st gen ל-**2nd gen**
   (`firebase-functions/v2/firestore`, `onDocumentCreated/Updated/Deleted`) -
   2nd gen כן תומך בשילוב הזה (מתועד רשמית). ה-OAuth callback **נשאר**
   1st gen בכוונה (לא היה צריך לשנות אותו - הבעיה הזו לא נגעה אליו,
   וה-1st gen שם עדיין נכון בשביל כתובת https קבועה).
4. ❌ **הניסיון לפרוס את 3 הפונקציות המתוקנות (2nd gen) נכשל גם הוא**,
   על שגיאת IAM **שלישית ושונה** (לא קשורה לקודמות):
   ```
   Validation failed for trigger .../onappointmentcreated-...: Invalid
   resource state for "": Permission denied while using the Eventarc
   Service Agent. ... verify that it has Eventarc Service Agent role.
   ```
   וגם (בלוג המלא, לא חוסם בהכרח אבל כדאי לתקן גם אותו):
   ```
   Compute Engine API has not been used in project 395404001906 before
   or it is disabled.
   ```
   **מחקתי את 3 הפונקציות הישנות (1st gen, שבורות ולא עבדו בכל מקרה)**
   לפני הניסיון הזה - אז **כרגע שלוש פונקציות הסנכרון לא קיימות בפרויקט
   בכלל** (לא במצב שבור, ולא במצב תקין - נמחקו). זה בטוח (אין עדיין
   משתמשות אמיתיות שמסתמכות עליהן), אבל חשוב שתדעי את זה.

## מה נדרש ממך כדי להמשיך (סבב שלישי של תיקוני IAM - מצטער על החזרות)

1. **להפעיל את Compute Engine API** (אם עדיין לא מופעל): Google Cloud
   Console → APIs & Services → Library → לחפש "Compute Engine API" →
   Enable. (או ישירות: https://console.developers.google.com/apis/api/compute.googleapis.com/overview?project=395404001906)
2. **להעניק ל-Eventarc Service Agent את ה-role שלו**: IAM & Admin → IAM →
   ללחוץ על "Include Google-provided role grants" (checkbox למעלה מימין
   ברשימה - אחרת ה-service agents האלה מוסתרים כברירת מחדל) → לחפש
   `service-395404001906@gcp-sa-eventarc.iam.gserviceaccount.com`.
   - אם קיים אבל בלי ה-role: Edit → Add role → **Eventarc Service Agent**
     (`roles/eventarc.serviceAgent`) → Save.
   - אם לא קיים בכלל: כנראה שה-Eventarc API עצמו לא הופעל/אותחל
     כמו שצריך - Google Cloud Console → APIs & Services → Library →
     "Eventarc API" → לוודא שהוא Enabled (אם לא - Enable, מה שאמור
     ליצור את ה-service agent אוטומטית) - ואז לחזור לצעד הקודם ולוודא
     שה-role בכל זאת נמצא שם (כפי שראינו כבר פעמיים בפרויקט הזה - הענקות
     אוטומטיות לא תמיד קורות בו, אז ייתכן שעדיין תצטרכי להוסיף את ה-role
     ידנית גם אחרי הפעלת ה-API).
3. Google עצמם כותבים בהודעת השגיאה: "may take a few minutes before all
   necessary permissions are propagated" - כדאי לחכות כמה דקות אחרי
   השינוי לפני שמנסים שוב.
4. בקשי ממני "תריץ deploy שוב" - אפרוס רק את 3 פונקציות הסנכרון
   (`firebase deploy --only functions:onAppointmentCreated,functions:onAppointmentUpdated,functions:onAppointmentDeleted`),
   כי ה-callback כבר פרוס ועובד ואין צורך לגעת בו שוב.

## ⚠️ ממצא מריצה קודמת, עדיין לא טופל - חשוב

בתחילת ההרצה הראשונה של הלילה גיליתי שה-working tree חזר להיות זהה
ל-commit ישן יותר - השינויים מהשיחות הקודמות (מעבר לאייקוני lucide-react,
תיקון התנגשות ה-ID של hairItems, הסרת לוגי דיבאג) נעלמו מהקוד. עדיין לא
טופל - כדאי לבדוק את זה, ייתכן שבאג ה-permission-denied ב-AddHairModal
חזר.

**גם קובץ ה-progress.md הזה עצמו התרוקן לבד (0 בייטים) כמה פעמים במהלך
הלילה בלי שאני נגעתי בו** - יש כאן דפוס חוזר שכדאי לחקור (אולי כלי/תהליך
ברקע בסביבת Firebase Studio שדורס קבצים מסוימים). כתבתי אותו מחדש בכל
פעם, אבל שווה לשים לב.
