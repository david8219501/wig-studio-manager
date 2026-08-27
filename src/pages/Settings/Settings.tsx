import { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import "./Settings.css";

// חייבים להיות זהים בדיוק לערכים ב-functions/src/config.ts (project קבוע,
// לא נבחר דינמית) - כתובת ה-callback ידועה מראש כדי שאפשר יהיה למסור
// אותה ל-Google Cloud Console עוד לפני שהפונקציות נפרסות בפועל.
const OAUTH_REDIRECT_URI = "https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

// לא סודי (Client ID תמיד חשוף בצד לקוח בזרימת OAuth) - אבל טרם הוגדר
// ערך אמיתי; ראו functions/README.md ו-progress.md.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type ConnectionStatus = "unknown" | "connected" | "error";

export default function Settings() {
  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // אחרי חזרה מ-Google (ה-callback מפנה בחזרה עם ?googleCalendar=...) -
  // מציגים הודעת הצלחה/כישלון ומנקים את זה מה-URL כדי שרענון לא יציג שוב.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("googleCalendar");
    if (!result) return;

    if (result === "connected") {
      setStatus("connected");
    } else if (result === "error") {
      setStatus("error");
      setErrorReason(params.get("reason"));
    }

    params.delete("googleCalendar");
    params.delete("reason");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []);

  const handleConnectGoogleCalendar = () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId || !GOOGLE_CLIENT_ID) return;

    // מפנים ישירות לדף ההסכמה של גוגל - אין צורך בפונקציית "התחלה"
    // נפרדת בצד השרת, כי client_id אינו סודי. state=businessId מזהה
    // לאיזה עסק לשייך את ה-refresh_token שיתקבל ב-callback (ראו הערת
    // האבטחה המפורטת ב-functions/src/googleCalendarAuth.ts).
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_URI,
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state: businessId,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div className="settings-page">
      <div className="placeholder-card">
        <h2>⚙️ הגדרות מערכת</h2>
        <p>כאן תוכל לנהל בהמשך את הגדרות העסק, פרטי פרופיל, צבעי ממשק והגדרות חיבור ל-Firebase של גוגל.</p>
      </div>

      <div className="placeholder-card google-calendar-card">
        <h2>📅 סנכרון יומן Google Calendar</h2>
        <p>
          חיבור חד-פעמי שמאפשר לכל תור חדש/מעודכן/נמחק ביומן הפגישות של המערכת
          להופיע אוטומטית גם ב-Google Calendar האישי שלך.
        </p>

        {status === "connected" && (
          <div className="google-calendar-status google-calendar-status--success">
            החיבור ל-Google Calendar הצליח! תורים חדשים יסונכרנו אוטומטית מעכשיו.
          </div>
        )}
        {status === "error" && (
          <div className="google-calendar-status google-calendar-status--error">
            החיבור ל-Google Calendar נכשל{errorReason ? ` (${errorReason})` : ""}. נסי שוב, ואם זה חוזר - פני לתמיכה.
          </div>
        )}

        {!GOOGLE_CLIENT_ID && (
          <div className="google-calendar-status google-calendar-status--error">
            תכונה זו עדיין לא הוגדרה במלואה על ידי הצוות הטכני (חסר Google Client ID) - החיבור עדיין לא זמין.
          </div>
        )}

        <button
          type="button"
          className="btn-google-calendar"
          onClick={handleConnectGoogleCalendar}
          disabled={!GOOGLE_CLIENT_ID}
        >
          התחבר ל-Google Calendar
        </button>
      </div>
    </div>
  );
}
