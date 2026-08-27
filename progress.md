# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28 (הרצה אוטונומית, בלי עצירה לאישור)

1. ✅ **firebase init functions (TypeScript)** — לא הרצתי את ה-wizard האינטראקטיבי
   בפועל (`firebase login` לא בוצע בסביבה הזו - ראו שלב 6), אבל בניתי ידנית
   את אותה תשתית בדיוק: `.firebaserc` (project: `esti-wigs-system`),
   `firebase.json` (functions בלבד, `predeploy` שמריץ `npm run build`),
   `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore`.
2. ✅ **npm install googleapis google-auth-library ב-functions/** — הותקנו
   בהצלחה, יחד עם `firebase-admin`/`firebase-functions` (נדרשים להרצה).
   `npm run build` (tsc) ב-functions/ עובר נקי.
3. ✅ **HTTP function ל-OAuth callback** — `functions/src/googleCalendarAuth.ts`
   (`googleCalendarOAuthCallback`). מחליפה code ל-tokens, שומרת
   `refreshToken` ב-`users/{businessId}/private/googleCalendar` (Admin SDK
   בלבד). **החלטה שלי:** נבנתה כפונקציית 1st gen (`firebase-functions/v1`)
   ולא 2nd gen, כדי לקבל כתובת https קבועה וידועה מראש
   (`https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`)
   - 2nd gen מקבל כתובת Cloud Run אקראית שנודעת רק אחרי פריסה, וזה לא
   התאים כאן כי הפריסה עצמה חסומה (שלב 6). לגבי כלל ה-Firestore Rules
   שהתבקש: **לא פרסתי rules חדשים** - אין בריפו הזה עותק של ה-rules
   הקיימים ב-production (הם רק בקונסולת Firebase), ופריסת קובץ מנוחש
   הייתה מסוכנת (עלולה למחוק/לשבור כללים קיימים לכל שאר ה-collections).
   הכלל המוצע כתוב ב-`firestore-rules-google-calendar-addition.txt`
   בשורש הריפו, עם הסבר למה זה כנראה בטוח גם בלעדיו (Admin SDK עוקף
   rules לגמרי; ברירת המחדל של Firestore היא deny) - צריך למזג ידנית.
4. ✅ **Firestore Triggers על appointments** — `functions/src/googleCalendarSync.ts`:
   `onAppointmentCreated`/`onAppointmentUpdated`/`onAppointmentDeleted`.
   שומרות `googleCalendarEventId` בחזרה על מסמך התור, עם הגנה מפורשת נגד
   לולאה אינסופית (onUpdate מתעלם אם רק googleCalendarEventId השתנה).
   עסק שלא חיבר Google Calendar (`getCalendarClientForBusiness` מחזיר
   `null`) - מדולג בשקט, לא נכשל.
5. ✅ **כפתור "התחבר ל-Google Calendar"** — נוסף לדף ההגדרות
   (`src/pages/Settings/Settings.tsx`, לא ל-Calendar - זו הייתה ברירת
   המחדל שבחרתי מבין שתי האפשרויות שהוצעו, כי זו פעולת "הגדרת חיבור
   חד-פעמית" ולא פעולה שוטפת של ניהול יומן). בונה את קישור ה-OAuth של
   גוגל ישירות בצד הלקוח (client_id אינו סודי) ומפנה את הדפדפן. מציג
   הודעת הצלחה/כישלון אחרי חזרה מ-Google, ומושבת עם הודעה מתאימה כל עוד
   `VITE_GOOGLE_CLIENT_ID` לא מוגדר (ראו חסימה בשלב 6).
6. ❌ **firebase deploy --only functions - חסום, לא בוצע.** שתי סיבות
   נפרדות, שתיהן חייבות להיפתר לפני שאפשר לפרוס:
   - **firebase login לא בוצע** בסביבה הזו. בדקתי (`firebase projects:list`)
     וקיבלתי `Unable to refresh auth: not yet authenticated` - למרות
     שיש טוקן login שמור (`~/.config/configstore/firebase-tools.json`,
     עבור 8487353@gmail.com), ה-CLI מדווח על כשל דרך "Studio Workspace"
     (הודעת שגיאה ספציפית לסביבת Firebase Studio/IDX שהריפו הזה רץ
     בתוכה) - כנראה נדרש חיבור מחדש דרך פאנל ה-Studio עצמו, לא
     `firebase login` רגיל בטרמינל. לא ניסיתי `firebase login`
     אינטראקטיבי בעצמי - זה דורש פתיחת דפדפן ואישור עם חשבון גוגל
     שלך אישית, שום דרך לעשות את זה בשבילך.
   - **ה-Client ID וה-Client Secret של Google לא התקבלו בפועל** - ההודעה
     המקורית הכילה את הטקסט המילולי `[תדביק כאן]` במקום ערכים אמיתיים.
     גם אם ה-login היה פתור, לא הייתי יכול להריץ
     `firebase functions:secrets:set` עם ערך אמיתי - ולא ניסיתי לזייף
     ערך, כי זה היה יוצר פריסה שבורה בלי שום סימן שהיא שבורה.

## מה נדרש ממך (סדר מומלץ)

1. להתחבר מחדש ל-Firebase בסביבה הזו (ככל הנראה דרך פאנל ה-Studio, לא
   רק `firebase login` בטרמינל - ראו שלב 6 למעלה).
2. ליצור OAuth Client ID אמיתי (או להשתמש בקיים) ב-Google Cloud Console,
   ולהוסיף תחת Authorized redirect URIs בדיוק:
   `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`
3. להריץ (עם הערכים האמיתיים):
   ```
   firebase functions:secrets:set GOOGLE_CLIENT_ID
   firebase functions:secrets:set GOOGLE_CLIENT_SECRET
   ```
4. ליצור קובץ `.env` בשורש הריפו (ראו `.env.example`) עם
   `VITE_GOOGLE_CLIENT_ID=<אותו Client ID>`.
5. למזג ידנית את הכלל מ-`firestore-rules-google-calendar-addition.txt`
   בקונסולת Firebase (Firestore Rules).
6. `firebase deploy --only functions`.
7. `npm run build && git add ... && git commit` (או לבקש ממני להריץ שוב
   אחרי שהכל מוגדר).

## ⚠️ ממצא נוסף, לא קשור למשימה הזו - חשוב

גיליתי בתחילת ההרצה שהעץ המקומי (working tree) חזר להיות זהה ל-commit
האחרון (`git status` נקי לגמרי חוץ מהקבצים החדשים של המשימה הזו). זה
אומר שכל השינויים הלא-מחוייבים (uncommitted) מהשיחות הקודמות - **מעבר
כל האימוג'ים ל-lucide-react**, **תיקון התנגשות ה-ID של hairItems בין
עסקים** (הבאג ב-`nextHairId`), וגם **הסרת לוגי הדיבאג הזמניים** -
נעלמו מהקוד בפועל (חזרו למצב שהיה ב-commit `5258e7c`, לפני התיקונים
האלה). לא בדקתי/שיחזרתי אותם - זה מחוץ להיקף המשימה הזו של הלילה, ולא
רציתי "לנחש" ולבצע מחדש שינויים גדולים בלי לוודא קודם מולך שזה באמת מה
שקרה ולמה. **כדאי לבדוק את זה כשתתעוררי** - יכול להיות שבאג ה-permission-denied
ב-AddHairModal חזר.
