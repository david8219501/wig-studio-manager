// functions/src/googleCalendarStatus.ts
// שני callables קטנים לניהול מצב החיבור ל-Google Calendar מצד הלקוח,
// בלי לחשוף אף פעם את ה-refresh_token עצמו (או אפילו את קיומו) ללקוח -
// users/{uid}/private/** חסום לגמרי לגישת לקוח (ראו
// firestore-rules-google-calendar-addition.txt), אז כל בדיקה חייבת
// לעבור דרך Admin SDK כאן.
//
// getGoogleCalendarStatus: קוראת את ה-refresh_token (Admin SDK בלבד),
// ומשקפת בוליאני בלבד (googleCalendarConnected) על users/{uid} הרגיל -
// מסמך שהלקוח כבר קורא ממנו דברים אחרים (businessName וכו', ראו
// App.tsx), כך שהוא יכול גם להאזין לשדה הזה בזמן אמת (onSnapshot) בלי
// שום צורך בגישה ל-path הפרטי. גם "מתקנת" בדרך אגב חשבונות שהתחברו
// *לפני* שהשיקוף הזה נוסף (ל-googleCalendarOAuthCallback) - קריאה
// ראשונה לפונקציה הזו כותבת את הדגל הנכון אם הוא עדיין חסר/שגוי.
//
// disconnectGoogleCalendar: מוחקת את ה-refresh_token השמור ומאפסת את
// הדגל - לא מבטלת בפועל את ההרשאה מול גוגל עצמה (revoke), רק מפסיקה
// את הסנכרון מהצד שלנו; המשתמשת יכולה גם לבטל ידנית דרך
// myaccount.google.com/permissions אם תרצה.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { googleCalendarPrivateDocPath } from "./config";

const REGION = "us-central1";

export const getGoogleCalendarStatus = onCall({ region: REGION }, async (request) => {
  const businessId = request.auth?.uid;
  if (!businessId) {
    throw new HttpsError("unauthenticated", "יש להתחבר למערכת.");
  }

  const privateSnap = await admin.firestore().doc(googleCalendarPrivateDocPath(businessId)).get();
  const connected = !!(privateSnap.data() as { refreshToken?: string } | undefined)?.refreshToken;

  await admin
    .firestore()
    .doc(`users/${businessId}`)
    .set({ googleCalendarConnected: connected }, { merge: true });

  return { connected };
});

export const disconnectGoogleCalendar = onCall({ region: REGION }, async (request) => {
  const businessId = request.auth?.uid;
  if (!businessId) {
    throw new HttpsError("unauthenticated", "יש להתחבר למערכת.");
  }

  await admin.firestore().doc(googleCalendarPrivateDocPath(businessId)).delete();
  await admin
    .firestore()
    .doc(`users/${businessId}`)
    .set({ googleCalendarConnected: false }, { merge: true });

  return { success: true };
});
