// functions/src/googleCalendarAuth.ts
// מטפלת ב-OAuth callback מגוגל: מקבלת authorization code, מחליפה אותו
// ל-access_token+refresh_token מול Google, ושומרת את ה-refresh_token
// ב-Firestore תחת users/{businessId}/private/googleCalendar (Admin SDK
// בלבד - ראו firestore.rules.google-calendar.md).
//
// זרימת ההתחברות (ראו גם src/pages/Settings/Settings.tsx בצד הלקוח):
// 1. הכפתור "התחבר ל-Google Calendar" בונה בעצמו את קישור ההרשאה של גוגל
//    (client_id בלבד - לא סודי) עם state=<uid של העסק המחובר>, ומפנה
//    אליו את הדפדפן ישירות. אין צורך בפונקציה נפרדת ל"התחלת" הזרימה.
// 2. גוגל מפנה בחזרה לכתובת הזו (OAUTH_REDIRECT_URI) עם code+state.
// 3. הפונקציה הזו מחליפה את ה-code ושומרת את התוצאה.
//
// הערת אבטחה מכוונת (הוחלט כאן, לא אושרר במפורש מראש): ה-state הוא
// uid גולמי, לא חתום/מוצפן. ה-uid של עסק אינו סוד (הוא ה-Firestore
// businessId שמופיע בכל מקום באפליקציה ממילא), וה-code שגוגל מנפיקה
// תקף רק מול client_id+redirect_uri שלנו ומול חשבון הגוגל שהמשתמש
// אישר בפועל בדף ההסכמה - כך שאין דרך לגורם חיצוני "להזריק" state
// מזויף ולגרום לנו לשמור token שהוא לא הפיק בעצמו. הסיכון היחיאתי
// שנשאר: אם מישהי מנחשת uid של עסק אחר ומפעילה בעצמה את זרימת ה-OAuth
// עם ה-state הזה, היא "רק" מחברת את חשבון ה-Google שלה-היא ליומן של
// עסק אחר (לא חושפת מידע, ולא ניתן לגשת ליומן של מישהו אחר) - נמוך
// חומרה, אבל לא אפס. לחיזוק עתידי: לחתום את ה-state (HMAC עם סוד נוסף,
// או Firebase custom token קצר-מועד) ולוודא אותו כאן לפני הכתיבה.
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createOAuth2Client } from "./googleClient";
import { APP_BASE_URL, googleCalendarPrivateDocPath } from "./config";

// runWith({ secrets }) (ולא onRequest({ secrets }) בסגנון v2) כי משתמשים
// ב-firebase-functions/v1 בכוונה - כדי לקבל כתובת https קבועה וידועה
// מראש (https://<region>-<project>.cloudfunctions.net/<name>), בניגוד
// ל-2nd gen שמקבל כתובת Cloud Run אקראית שנודעת רק אחרי הפריסה בפועל.
// ראו config.ts - OAUTH_REDIRECT_URI נבנה מהנחה הזו.
export const googleCalendarOAuthCallback = functionsV1
  .runWith({ secrets: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] })
  .https.onRequest(async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const businessId = typeof req.query.state === "string" ? req.query.state : undefined;
    const oauthError = typeof req.query.error === "string" ? req.query.error : undefined;

    if (oauthError) {
      // המשתמשת ביטלה את ההרשאה בדף ההסכמה של גוגל, או שגיאה אחרת מצד גוגל.
      res.redirect(`${APP_BASE_URL}/?googleCalendar=error&reason=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!code || !businessId) {
      res.status(400).send("חסר code או state בבקשת ה-callback מגוגל.");
      return;
    }

    try {
      const oauth2Client = createOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        // גוגל לא מחזירה refresh_token אם המשתמש כבר אישר את האפליקציה
        // בעבר ולא ביקשנו prompt=consent - הלקוח (Settings.tsx) תמיד
        // מוסיף prompt=consent&access_type=offline, אז זה לא אמור לקרות
        // בזרימה הרגילה, אבל שומרים על מקרה קצה ברור במקום כשל שקט.
        res.redirect(`${APP_BASE_URL}/?googleCalendar=error&reason=no_refresh_token`);
        return;
      }

      await admin
        .firestore()
        .doc(googleCalendarPrivateDocPath(businessId))
        .set(
          {
            refreshToken: tokens.refresh_token,
            scope: tokens.scope ?? null,
            connectedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      res.redirect(`${APP_BASE_URL}/?googleCalendar=connected`);
    } catch (err) {
      console.error("שגיאה בהחלפת קוד ה-OAuth של Google Calendar:", err);
      res.redirect(`${APP_BASE_URL}/?googleCalendar=error&reason=exchange_failed`);
    }
  });
