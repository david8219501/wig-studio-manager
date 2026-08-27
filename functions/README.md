# Cloud Functions - סנכרון Google Calendar

## מה יש כאן

- `googleCalendarOAuthCallback` (HTTPS, 1st gen) - מטפלת ב-redirect שחוזר
  מגוגל אחרי שהמשתמשת מאשרת גישה, מחליפה את ה-`code` ל-`refresh_token`,
  ושומרת אותו ב-Firestore תחת `users/{businessId}/private/googleCalendar`.
  כתובת קבועה: `https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback`.
- `onAppointmentCreated` / `onAppointmentUpdated` / `onAppointmentDeleted`
  (Firestore triggers, 1st gen) - שומרות על יומן ה-Google Calendar של כל
  עסק מסונכרן עם אוסף `appointments` שלו.

## למה 1st gen ולא 2nd gen?

פונקציות 2nd gen (`firebase-functions/v2`) מקבלות כתובת Cloud Run אקראית
שנודעת רק אחרי פריסה בפועל. כאן היינו צריכים למסור כתובת redirect קבועה
ל-Google Cloud Console **לפני** שהפריסה בכלל קרתה (כי הפריסה חסומה - ראו
progress.md) - אז 1st gen, עם הכתובת הצפויה
`https://<region>-<project>.cloudfunctions.net/<name>`, היה הכרחי.

## הגדרת ה-Secrets לפני פריסה (חובה - עדיין לא בוצע)

`GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET` לא נמצאים בשום קובץ בקוד -
הם מוזרקים כ-Secrets דרך Secret Manager. **חובה** להריץ את שתי הפקודות
האלה (עם ה-Client ID/Secret האמיתיים מ-Google Cloud Console) לפני
`firebase deploy --only functions`, אחרת הפריסה תיכשל או תיתקע על
prompt אינטראקטיבי:

```bash
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
```

כל פקודה תבקש להדביק את הערך (stdin), ותשמור אותו ב-Secret Manager -
לא בקוד, לא ב-git.

## Authorized redirect URI ב-Google Cloud Console

תחת ה-OAuth Client ID ב-Google Cloud Console -> Authorized redirect URIs,
יש להוסיף בדיוק:

```
https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback
```

## פריסה

```bash
firebase login          # אם עוד לא בוצע בסביבה הזו
firebase deploy --only functions
```

## הנחה שלא אומתה - דומיין האתר

`APP_BASE_URL` ב-`src/config.ts` (ובהתאמה, גם ה-redirect אחרי חיבור/כישלון
ב-`googleCalendarAuth.ts`) מניח שהאתר רץ בדומיין ברירת המחדל של Firebase
Hosting: `https://esti-wigs-system.web.app`. אם האתר בפועל רץ בדומיין
מותאם אישית - צריך לעדכן את הקבוע הזה.

## מה עוד חסר להפעלה מלאה

1. `VITE_GOOGLE_CLIENT_ID` בקובץ `.env` בשורש הריפו (ראו `.env.example`) -
   כרגע אין ערך, אז כפתור "התחבר ל-Google Calendar" ב-`Settings.tsx`
   מושבת עם הודעה מתאימה.
2. שני ה-Secrets שלמעלה.
3. `firebase login` בסביבה שממנה מריצים `firebase deploy`.
4. הכלל ב-Firestore Rules שחוסם גישת לקוח ל-`users/{uid}/private/**` -
   ראו `firestore-rules-google-calendar-addition.txt` בשורש הריפו. **לא
   פרסתי rules חדשים בעצמי** - אין בריפו הזה עותק של ה-rules שכבר בפרודקשן
   (הם קיימים רק בקונסולת Firebase), ופריסת קובץ rules מנחש-מהיסוד הייתה
   עלולה למחוק/לשבור כללים קיימים לכל שאר ה-collections (clients, orders,
   appointments, hairItems, bulkItems, expenses, users) בלי שיש לי דרך
   לדעת מה הם כרגע. יש למזג את הכלל המצורף ידנית, בקונסולה, אחרי בדיקה
   שהוא לא מתנגש עם משהו קיים.
