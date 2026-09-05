import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, functions } from "../../services/firebase";
import ConfirmDialog from "../../components/common/ConfirmDialog";
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
type SyncStatus = "idle" | "syncing" | "done" | "error";

export default function Settings() {
  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  // מצב חיבור אמיתי (לא רק "חזרנו הרגע מגוגל") - נגזר חי מ-
  // users/{uid}.googleCalendarConnected. השדה הזה הוא שיקוף לא-רגיש
  // (בוליאני בלבד) שנכתב ע"י Admin SDK בלבד; ה-refresh_token עצמו יושב
  // תחת users/{uid}/private/googleCalendar, חסום לגמרי לגישת לקוח (ראו
  // firestore-rules-google-calendar-addition.txt) - אי אפשר להאזין אליו
  // ישירות, בכוונה, כי הוא מכיל סוד אמיתי.
  const [isConnected, setIsConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);

  // בדיקה חד-פעמית דרך callable (Admin SDK) - זו גם "מתקנת" (self-heal)
  // חשבונות שהתחברו לפני שהשיקוף הזה נוסף, שעדיין אין להם את השדה על
  // users/{uid} בכלל. אחריה, מאזין חי (onSnapshot) על users/{uid} עצמו
  // תופס כל שינוי עתידי בזמן אמת (למשל אם ההתחברות הושלמה בלשונית אחרת).
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const getStatus = httpsCallable<void, { connected: boolean }>(functions, "getGoogleCalendarStatus");
    getStatus()
      .then((res) => setIsConnected(res.data.connected))
      .catch((err) => console.error("שגיאה בבדיקת סטטוס חיבור Google Calendar:", err));

    const unsubscribe = onSnapshot(
      doc(db, "users", businessId),
      (snap) => {
        const connected = (snap.data() as { googleCalendarConnected?: boolean } | undefined)?.googleCalendarConnected;
        setIsConnected(!!connected);
      },
      (err) => console.error("שגיאה במעקב חי אחרי סטטוס חיבור Google Calendar:", err)
    );
    return () => unsubscribe();
  }, []);

  const handleDisconnectGoogleCalendar = async () => {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const disconnect = httpsCallable(functions, "disconnectGoogleCalendar");
      await disconnect();
      setConfirmDisconnectOpen(false);
    } catch (err) {
      console.error("שגיאה בניתוק מ-Google Calendar:", err);
      setDisconnectError("שגיאה בניתוק. נסי שוב.");
    } finally {
      setDisconnecting(false);
    }
  };

  // אחרי חזרה מ-Google (ה-callback מפנה בחזרה עם ?googleCalendar=...) -
  // מציגים הודעת הצלחה/כישלון ומנקים את זה מה-URL כדי שרענון לא יציג שוב.
  // בחיבור מוצלח - מפעילים מיד (בלי כפתור נפרד) סנכרון חד-פעמי של כל
  // הפגישות הקיימות שנוצרו לפני החיבור (syncExistingAppointments).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("googleCalendar");
    if (!result) return;

    if (result === "connected") {
      setStatus("connected");
      setSyncStatus("syncing");
      const syncExistingAppointments = httpsCallable<void, { syncedCount: number }>(
        functions,
        "syncExistingAppointments"
      );
      syncExistingAppointments()
        .then((res) => {
          setSyncedCount(res.data.syncedCount);
          setSyncStatus("done");
        })
        .catch((err) => {
          console.error("שגיאה בסנכרון פגישות קיימות ל-Google Calendar:", err);
          setSyncStatus("error");
        });
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
        {syncStatus === "syncing" && (
          <div className="google-calendar-status google-calendar-status--info">
            מסנכרן פגישות קיימות...
          </div>
        )}
        {syncStatus === "done" && (
          <div className="google-calendar-status google-calendar-status--success">
            {syncedCount && syncedCount > 0
              ? `הועברו ${syncedCount} פגישות ליומן.`
              : "אין פגישות ישנות להעביר."}
          </div>
        )}
        {syncStatus === "error" && (
          <div className="google-calendar-status google-calendar-status--error">
            הסנכרון של הפגישות הקיימות נכשל. תורים חדשים עדיין יסונכרנו אוטומטית - אפשר לפנות לתמיכה לגבי הפגישות הישנות.
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

        {isConnected && (
          <div className="google-calendar-status google-calendar-status--success">
            ✓ מחובר ל-Google Calendar
          </div>
        )}
        {disconnectError && (
          <div className="google-calendar-status google-calendar-status--error">{disconnectError}</div>
        )}

        {isConnected ? (
          <button
            type="button"
            className="btn-google-calendar btn-google-calendar--disconnect"
            onClick={() => setConfirmDisconnectOpen(true)}
            disabled={disconnecting}
          >
            {disconnecting ? "מנתקת..." : "התנתק מגוגל"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-google-calendar"
            onClick={handleConnectGoogleCalendar}
            disabled={!GOOGLE_CLIENT_ID}
          >
            התחבר ל-Google Calendar
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDisconnectOpen}
        title="ניתוק מ-Google Calendar"
        message="לנתק את החיבור? תורים חדשים לא יסונכרנו יותר אוטומטית ל-Google Calendar, עד שתתחברי מחדש."
        variant="danger"
        confirmLabel={disconnecting ? "מנתקת..." : "כן, נתקי"}
        onConfirm={handleDisconnectGoogleCalendar}
        onCancel={() => setConfirmDisconnectOpen(false)}
      />
    </div>
  );
}
