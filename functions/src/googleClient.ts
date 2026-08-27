// functions/src/googleClient.ts
// בונה לקוח Google Calendar מאומת לעסק נתון, מתוך ה-refresh_token השמור
// עבורו ב-Firestore (googleCalendarPrivateDocPath). מחזיר null אם העסק
// עדיין לא חיבר Google Calendar - זה מצב תקין (לא שגיאה), שקורה לרוב
// העסקים שלא לחצו על "התחבר ל-Google Calendar" בכלל.
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as admin from "firebase-admin";
import { OAUTH_REDIRECT_URI, googleCalendarPrivateDocPath } from "./config";

export function createOAuth2Client(): OAuth2Client {
  // GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET מוזרקים כ-Secrets (ראו
  // runWith({ secrets: [...] }) בכל פונקציה שמשתמשת בלקוח הזה) - לא
  // מקובץ .env ולא מקודדים בקוד.
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET לא מוגדרים - יש להריץ " +
        "firebase functions:secrets:set לפני הפריסה (ראו functions/README.md)."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, OAUTH_REDIRECT_URI);
}

export interface BusinessCalendarClient {
  calendar: calendar_v3.Calendar;
}

/**
 * טוען את ה-refresh_token של העסק ובונה ממנו לקוח Calendar מאומת.
 * מחזיר null אם העסק לא חיבר את Google Calendar בכלל (אין מסמך/refresh_token) -
 * הקריאה מהטריגרים על appointments צריכה להתייחס לזה כ"אין מה לסנכרן", לא כשגיאה.
 */
export async function getCalendarClientForBusiness(
  businessId: string
): Promise<BusinessCalendarClient | null> {
  const snap = await admin.firestore().doc(googleCalendarPrivateDocPath(businessId)).get();
  const data = snap.data() as { refreshToken?: string } | undefined;
  if (!data?.refreshToken) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: data.refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return { calendar };
}
