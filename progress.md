# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28

1. ✅ **firebase init functions (TypeScript)** — תשתית `functions/` בנויה
   ידנית (`.firebaserc`, `firebase.json`, `functions/package.json`,
   `functions/tsconfig.json`, `functions/.gitignore`).
2. ✅ **npm install googleapis google-auth-library ב-functions/** —
   הותקנו בהצלחה, יחד עם `firebase-admin`/`firebase-functions`.
   `npm run build` (tsc) ב-functions/ עובר נקי.
3. ✅ **HTTP function ל-OAuth callback** — `functions/src/googleCalendarAuth.ts`
   (`googleCalendarOAuthCallback`), 1st gen בכוונה (כתובת https קבועה
   מראש). כלל ה-Firestore Rules המבוקש לא פורסם אוטומטית - נשאר כטקסט
   מוצע ב-`firestore-rules-google-calendar-addition.txt` למיזוג ידני
   (ראו הסבר בשלב 6 הישן/גרסה קודמת של הקובץ הזה, עדיין תקף).
4. ✅ **Firestore Triggers על appointments** — `functions/src/googleCalendarSync.ts`.
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות (`Settings.tsx`).
6. ❌ **firebase deploy --only functions - נכשל, לא מבאג בקוד.**

## מה קרה הלילה (הרצה שנייה, אחרי ש-login ו-secrets הוגדרו)

- ✅ `firebase login` עובד (`esti-wigs-system` מסומן current ב-`firebase projects:list`).
- ✅ שני ה-Secrets **נקבעו בהצלחה** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) -
  וידאתי עם `firebase functions:secrets:access` ששניהם קיימים עם ערך.
- ❌ **`firebase deploy --only functions` נכשל** על כל 4 הפונקציות (אף
  אחת לא נוצרה בפועל - `firebase functions:list` מחזיר "No functions
  found"). השגיאה המדויקת מ-Google Cloud (מתוך `--debug`):

  ```
  Failed to create 1st Gen function .../googleCalendarOAuthCallback:
  Default service account '395404001906-compute@developer.gserviceaccount.com'
  doesn't exist. Please recreate this account or specify a different account.
  ```

  **זו לא בעיה בקוד שכתבתי, וגם לא קשורה לסודות/login** - זו בעיית
  תשתית ברמת הפרויקט ב-Google Cloud: חשבון השירות המובנה של Compute
  Engine (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`),
  שפריסת Cloud Functions מ-Gen 1 מסתמכת עליו כברירת מחדל, לא קיים
  בפרויקט `esti-wigs-system` (נמחק בעבר, או שמדיניות ארגונית מנעה
  ממנו להיווצר מלכתחילה). זה משהו שרק אפשר לתקן דרך Google Cloud
  Console/IAM - לא דרך שינוי קוד, ולא ניסיתי לעקוף את זה (למשל דרך
  קריאות API ישירות עם טוקן שחילצתי מ-firebase-tools) כי זה נוגע
  להרשאות IAM ברמת הפרויקט כולו, מעבר להיקף שהוסמכתי לבצע בעצמי.

## מה נדרש ממך כדי להמשיך

**אפשרות א' (הכי מהירה, לנסות קודם):** בקונסולת Google Cloud (הפרויקט
`esti-wigs-system`) → IAM & Admin → Service Accounts:
- לחפש `395404001906-compute@developer.gserviceaccount.com`.
- אם הוא מופיע אבל **מושבת** - ללחוץ Enable.
- אם הוא **לא מופיע בכלל** (נמחק) - לסמן "Show deleted service accounts"
  (אם קיים בממשק) ולנסות Restore. אפשר גם דרך `gcloud`, אם יש לך אותו
  מוגדר עם הרשאות מתאימות על הפרויקט:
  ```
  gcloud iam service-accounts undelete 395404001906-compute@developer.gserviceaccount.com --project=esti-wigs-system
  ```
  (ייתכן שתידרש שם/מזהה מדויק יותר מהקונסולה אם הפקודה לא מזהה לפי המייל).

**אפשרות ב' (אם א' לא אפשרי - למשל אם מדיניות ארגונית חוסמת default
service accounts לגמרי):** ליצור service account ייעודי חדש ל-functions
האלה (IAM & Admin → Service Accounts → Create Service Account), להעניק
לו את התפקידים `Cloud Datastore User` (גישת Firestore ל-Admin SDK)
ו-`Secret Manager Secret Accessor` על שני ה-secrets, ולתת לי את כתובת
המייל שלו - אעדכן את `runWith({...})` בכל אחת מ-4 הפונקציות כך שישתמשו
בו במפורש (`serviceAccount: "..."`) במקום בברירת המחדל השבורה, ואז ננסה
לפרוס שוב.

אחרי שאחת מהאפשרויות מיושמת - פשוט בקשי ממני "תריץ deploy שוב" ואמשיך
משם (כולל עדכון הכתובת בפועל ב-`summary.md` ו-git commit/push).

## ⚠️ ממצא מהריצה הקודמת, עדיין לא טופל - חשוב

בתחילת ההרצה הקודמת גיליתי שה-working tree חזר להיות זהה ל-commit
שלפני מספר תיקונים (מעבר לאייקוני lucide-react, תיקון התנגשות ה-ID של
hairItems בין עסקים, הסרת לוגי דיבאג זמניים) - כאילו הם נעלמו/הוחזרו.
לא בדקתי את זה מחדש הלילה (מחוץ להיקף המשימה הנוכחית) - עדיין כדאי
לבדוק את זה, ייתכן שבאג ה-permission-denied ב-AddHairModal חזר.
