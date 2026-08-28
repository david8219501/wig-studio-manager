// functions/src/googleCalendarSync.ts
// טריגרים על אוסף appointments: כל שינוי (יצירה/עדכון/מחיקה) מסונכרן
// ליומן Google Calendar של העסק הרלוונטי, אם ואך ורק אם העסק חיבר את
// היומן שלו (יש לו refresh_token שמור - ראו googleClient.ts). עסק שלא
// חיבר יומן פשוט לא מסונכרן בשקט, זו לא שגיאה.
//
// 2nd gen (firebase-functions/v2/firestore) בכוונה, בניגוד ל-OAuth
// callback שנשאר 1st gen: מסד ה-Firestore של הפרויקט הזה הוא נam5
// (multi-region ארה"ב), וניסיון ראשון לפרוס טריגרים 1st gen נכשל בפועל
// בפריסה עם השגיאה "Resource .../appointments/{appointmentId} is in
// region nam5-us-central1 which is not supported" - מגבלה ידועה של
// Firestore triggers מ-1st gen מול Firestore multi-region. טריגרים
// 2nd gen (דרך Eventarc) כן תומכים בשילוב הזה כשהפונקציה נפרסת ב-
// us-central1 (חלק מה-nam5 bundle). אין כאן צורך בכתובת https קבועה
// (בניגוד ל-OAuth callback) כי אלה טריגרים על אירועי Firestore, לא
// endpoint שנקרא מבחוץ - אז אין סיבה להישאר ב-1st gen כאן.
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { calendar_v3 } from "googleapis";
import { getCalendarClientForBusiness, type BusinessCalendarClient } from "./googleClient";
import { APPOINTMENTS_TIMEZONE } from "./config";

export interface AppointmentDoc {
  businessId?: string;
  clientName?: string;
  type?: string;
  date?: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  phone?: string;
  googleCalendarEventId?: string;
}

const SECRETS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const REGION = "us-central1";
const DOCUMENT_PATH = "appointments/{appointmentId}";

// שם המזהה של האירוע ב-Google Calendar נשמר בחזרה על מסמך התור עצמו
// (googleCalendarEventId), כדי שעדכון/מחיקה עתידיים ידעו על איזה אירוע
// לפעול. השדות האלה (לא כולל googleCalendarEventId עצמו) הם אלה שבאמת
// משפיעים על תוכן האירוע ביומן - שינוי בהם הוא שמצדיק סנכרון onUpdate.
const SYNCED_FIELDS: (keyof AppointmentDoc)[] = [
  "clientName",
  "type",
  "date",
  "startTime",
  "endTime",
  "phone",
];

function hasSyncedFieldChange(before: AppointmentDoc, after: AppointmentDoc): boolean {
  return SYNCED_FIELDS.some((field) => before[field] !== after[field]);
}

function toEventDateTime(date: string, time: string): calendar_v3.Schema$EventDateTime {
  return {
    dateTime: `${date}T${time}:00`,
    timeZone: APPOINTMENTS_TIMEZONE,
  };
}

function buildEventBody(apt: AppointmentDoc): calendar_v3.Schema$Event | null {
  if (!apt.date || !apt.startTime || !apt.endTime) return null;
  return {
    summary: `${apt.type ?? "תור"} - ${apt.clientName ?? "לקוחה"}`,
    description: apt.phone ? `טלפון: ${apt.phone}` : undefined,
    start: toEventDateTime(apt.date, apt.startTime),
    end: toEventDateTime(apt.date, apt.endTime),
  };
}

// גוגל מחזירה 404/410 אם האירוע כבר לא קיים אצלה (למשל נמחק ידנית
// ישירות ב-Google Calendar) - זה לא מצב שאמור להפיל את הטריגר שלנו.
function isGoneError(err: unknown): boolean {
  const code = (err as { code?: number })?.code;
  return code === 404 || code === 410;
}

// פונקציית העזר המשותפת ליצירת אירוע ב-Google Calendar עבור פגישה -
// משמשת גם את הטריגר onAppointmentCreated למטה, גם את הנתיב החוזר
// ב-onAppointmentUpdated (כשאין עדיין googleCalendarEventId), וגם
// syncExistingAppointments.ts (סנכרון היסטורי חד-פעמי אחרי חיבור
// ראשוני) - כדי שלא תהיה נוסחה כפולה בשלושה מקומות.
export async function createCalendarEventForAppointment(
  client: BusinessCalendarClient,
  docRef: FirebaseFirestore.DocumentReference,
  apt: AppointmentDoc
): Promise<boolean> {
  const eventBody = buildEventBody(apt);
  if (!eventBody) return false;

  const { data } = await client.calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
  });
  if (!data.id) return false;

  await docRef.update({ googleCalendarEventId: data.id });
  return true;
}

export const onAppointmentCreated = onDocumentCreated(
  { document: DOCUMENT_PATH, region: REGION, secrets: SECRETS },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const apt = snap.data() as AppointmentDoc;
    if (!apt.businessId) return;

    const client = await getCalendarClientForBusiness(apt.businessId);
    if (!client) return; // העסק לא חיבר Google Calendar

    try {
      await createCalendarEventForAppointment(client, snap.ref, apt);
    } catch (err) {
      console.error(
        `שגיאה ביצירת אירוע ב-Google Calendar עבור appointment ${event.params.appointmentId}:`,
        err
      );
    }
  }
);

export const onAppointmentUpdated = onDocumentUpdated(
  { document: DOCUMENT_PATH, region: REGION, secrets: SECRETS },
  async (event) => {
    const change = event.data;
    if (!change) return;
    const before = change.before.data() as AppointmentDoc;
    const after = change.after.data() as AppointmentDoc;
    if (!after.businessId) return;

    // מונע לולאה אינסופית: הכתיבה החוזרת של googleCalendarEventId
    // מ-onCreate/onUpdate הזה עצמו מפעילה מחדש את onUpdate - אם שום
    // שדה "אמיתי" לא השתנה (כלומר רק googleCalendarEventId התעדכן),
    // אין מה לעשות כאן.
    if (!hasSyncedFieldChange(before, after)) return;

    const client = await getCalendarClientForBusiness(after.businessId);
    if (!client) return;

    const eventBody = buildEventBody(after);
    if (!eventBody) return;

    try {
      if (after.googleCalendarEventId) {
        try {
          await client.calendar.events.update({
            calendarId: "primary",
            eventId: after.googleCalendarEventId,
            requestBody: eventBody,
          });
          return;
        } catch (err) {
          if (!isGoneError(err)) throw err;
          // האירוע נמחק אצל גוגל בנפרד - ניצור אותו מחדש למטה במקום ליפול.
        }
      }

      // אין עדיין googleCalendarEventId (או שהאירוע הישן נעלם אצל גוגל) -
      // זה קורה גם לתורים שנוצרו לפני שהעסק חיבר את Google Calendar.
      await createCalendarEventForAppointment(client, change.after.ref, after);
    } catch (err) {
      console.error(
        `שגיאה בעדכון אירוע ב-Google Calendar עבור appointment ${event.params.appointmentId}:`,
        err
      );
    }
  }
);

export const onAppointmentDeleted = onDocumentDeleted(
  { document: DOCUMENT_PATH, region: REGION, secrets: SECRETS },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const apt = snap.data() as AppointmentDoc;
    if (!apt.businessId || !apt.googleCalendarEventId) return;

    const client = await getCalendarClientForBusiness(apt.businessId);
    if (!client) return;

    try {
      await client.calendar.events.delete({
        calendarId: "primary",
        eventId: apt.googleCalendarEventId,
      });
    } catch (err) {
      if (isGoneError(err)) return; // כבר לא קיים אצל גוגל - אין מה לעשות
      console.error(
        `שגיאה במחיקת אירוע מ-Google Calendar עבור appointment ${event.params.appointmentId}:`,
        err
      );
    }
  }
);
