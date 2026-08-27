// functions/src/config.ts
// קבועים גלובליים לאינטגרציית Google Calendar. הפרויקט וה-region קבועים
// (לא נבחרים דינמית), כדי שכתובת ה-callback תהיה ידועה מראש וניתנת
// למסירה מראש ל-Google Cloud Console תחת Authorized redirect URIs -
// גם לפני הפריסה בפועל.
export const PROJECT_ID = "esti-wigs-system";
export const REGION = "us-central1";

export const OAUTH_CALLBACK_FUNCTION_NAME = "googleCalendarOAuthCallback";
export const OAUTH_REDIRECT_URI = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${OAUTH_CALLBACK_FUNCTION_NAME}`;

// לאן מחזירים את הדפדפן בסיום זרימת ה-OAuth (הצלחה/כישלון). זוהי הנחה
// סבירה (דומיין ברירת המחדל של Firebase Hosting) - לא אומתה מול דומיין
// production בפועל. אם האתר רץ בדומיין אחר, יש לעדכן כאן.
export const APP_BASE_URL = `https://${PROJECT_ID}.web.app`;

// היקף ההרשאה המבוקש מגוגל - יצירה/עדכון/מחיקה של אירועים ביומן
// (לא כולל קריאת יומנים אחרים של המשתמש).
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

// אזור הזמן של כל הפגישות באפליקציה - לא נשמר per-business, כי זהו
// אפליקציית ניהול סלון פאות ישראלית (ראו CLAUDE.md).
export const APPOINTMENTS_TIMEZONE = "Asia/Jerusalem";

// היכן שומרים את ה-refresh token של העסק - Admin SDK בלבד, לקוח לא
// אמור לגשת ישירות ל-path הזה (ראו firestore.rules.google-calendar.md).
export const googleCalendarPrivateDocPath = (businessId: string): string =>
  `users/${businessId}/private/googleCalendar`;
