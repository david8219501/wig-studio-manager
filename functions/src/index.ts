// functions/src/index.ts
// נקודת הכניסה של כל ה-Cloud Functions. כל פונקציה מיוצאת כאן היא זו
// שתיפרס בפועל תחת השם שלה (firebase deploy --only functions מפרסם
// את כל מה שמיוצא מהקובץ הזה, כל אחת בנפרד).
import * as admin from "firebase-admin";

admin.initializeApp();

export { googleCalendarOAuthCallback } from "./googleCalendarAuth";
export {
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
} from "./googleCalendarSync";
export { syncExistingAppointments } from "./syncExistingAppointments";
export { getGoogleCalendarStatus, disconnectGoogleCalendar } from "./googleCalendarStatus";
