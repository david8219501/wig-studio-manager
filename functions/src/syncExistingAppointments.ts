// functions/src/syncExistingAppointments.ts
// סנכרון היסטורי חד-פעמי: אחרי חיבור ראשוני מוצלח ל-Google Calendar,
// מעבירה את כל הפגישות הקיימות של העסק (שנוצרו לפני החיבור, ולכן עדיין
// אין להן googleCalendarEventId) ליומן. callable (לא Firestore trigger) -
// נקראת ישירות מהלקוח (Settings.tsx) מיד אחרי שה-callback מסמן הצלחה.
//
// בטוחה מהרצה כפולה בעיצוב: מסננת רק מסמכים בלי googleCalendarEventId,
// אז הרצה נוספת (למשל אם המשתמשת מתחברת מחדש בטעות) לא יוצרת כפילויות -
// פגישות שכבר סונכרנו (יש להן השדה) פשוט מדולגות.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getCalendarClientForBusiness } from "./googleClient";
import { createCalendarEventForAppointment, type AppointmentDoc } from "./googleCalendarSync";

const SECRETS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const REGION = "us-central1";

export const syncExistingAppointments = onCall(
  { region: REGION, secrets: SECRETS },
  async (request) => {
    const businessId = request.auth?.uid;
    if (!businessId) {
      throw new HttpsError("unauthenticated", "יש להתחבר למערכת כדי לסנכרן פגישות.");
    }

    const client = await getCalendarClientForBusiness(businessId);
    if (!client) {
      throw new HttpsError(
        "failed-precondition",
        "העסק עדיין לא חיבר את Google Calendar - יש להתחבר קודם."
      );
    }

    const snapshot = await admin
      .firestore()
      .collection("appointments")
      .where("businessId", "==", businessId)
      .get();

    // Firestore לא תומך בשאילתת "השדה לא קיים" - הסינון נעשה כאן, אחרי
    // שליפת כל הפגישות של העסק (מספיק לכמות פגישות סבירה של סלון פאות).
    const pending = snapshot.docs.filter((doc) => !(doc.data() as AppointmentDoc).googleCalendarEventId);

    let syncedCount = 0;
    for (const doc of pending) {
      const apt = doc.data() as AppointmentDoc;
      try {
        const created = await createCalendarEventForAppointment(client, doc.ref, apt);
        if (created) syncedCount++;
      } catch (err) {
        console.error(`שגיאה בסנכרון פגישה קיימת ${doc.id} ל-Google Calendar:`, err);
      }
    }

    return { syncedCount };
  }
);
