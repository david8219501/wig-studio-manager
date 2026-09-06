import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { httpsCallable } from "firebase/functions";
import { deleteUser } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { auth, db, functions, storage } from "../../services/firebase";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_APPOINTMENT_TYPES } from "../../utils/businessSettings";
import "./Settings.css";

interface SettingsProps {
  // נקראת אחרי מחיקת חשבון מוצלחת - App.tsx צריך לעדכן isLoggedIn/
  // manualAuthRef בעצמו (Settings.tsx לא מחזיק state כזה). ראו הערה
  // מפורטת ליד handleLogout ב-App.tsx - אותה בעיה בדיוק חלה כאן
  // (onAuthStateChanged לבדו לא מספיק אחרי deleteUser).
  onAccountDeleted?: () => void;
}

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

export default function Settings({ onAccountDeleted }: SettingsProps) {
  // פרופיל העסק - נטען פעם אחת (getDoc, לא מאזין חי) לתוך state עריכה
  // מקומי, כמו כל טופס עריכה אחר באתר (ClientDrawer וכו') - מאזין חי
  // כאן היה דורס את מה שהמשתמשת מקלידה תוך כדי עריכה. שינוי שנשמר
  // (updateDoc) כן משתקף מיד בסיידבר/בכותרת - שם יש מאזין חי (App.tsx).
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);

  // העלאת לוגו - Firebase Storage תחת logos/{businessId}/logo.{ext},
  // ה-URL נשמר על users/{uid}.logoUrl. דורש שה-Storage bucket כבר קיים
  // בפרויקט (ראו הערה ב-services/firebase.ts) - אם עדיין לא הוקם, ההעלאה
  // תיכשל עם שגיאה ברורה (מטופלת למטה), לא תיתקע בשקט.
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDoc(doc(db, "users", businessId))
      .then((snap) => {
        const data = snap.data() as
          | { businessName?: string; phone?: string; address?: string; email?: string; logoUrl?: string }
          | undefined;
        setBusinessName(data?.businessName || "");
        setPhone(data?.phone || "");
        setAddress(data?.address || "");
        setEmail(data?.email || "");
        setLogoUrl(data?.logoUrl || null);
      })
      .catch((err) => console.error("שגיאה בטעינת פרופיל העסק:", err))
      .finally(() => setProfileLoading(false));
  }, []);

  const handleLogoFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // מאפשר לבחור שוב את אותו קובץ אם רוצים להעלות מחדש
    if (!file) return;

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setUploadingLogo(true);
    setLogoError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const logoRef = ref(storage, `logos/${businessId}/logo.${ext}`);
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      await updateDoc(doc(db, "users", businessId), { logoUrl: url });
      setLogoUrl(url);
    } catch (err) {
      console.error("שגיאה בהעלאת לוגו:", err);
      setLogoError(
        "שגיאה בהעלאת הלוגו - ייתכן ש-Firebase Storage עדיין לא הוקם לפרויקט הזה (דורש הפעלה חד-פעמית בקונסולת Firebase). פני לתמיכה הטכנית."
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    setSavingProfile(true);
    setProfileSaveMessage(null);
    try {
      await updateDoc(doc(db, "users", businessId), {
        businessName: businessName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
      });
      setProfileSaveMessage("success");
    } catch (err) {
      console.error("שגיאה בשמירת פרופיל העסק:", err);
      setProfileSaveMessage("error");
    } finally {
      setSavingProfile(false);
    }
  };

  // ניהול קטגוריות - שני מערכים ב-businessSettings/{uid}: expenseCategories
  // (Expenses.tsx) ו-appointmentTypes (Calendar.tsx). נטענים פעם אחת עם
  // אתחול לברירת המחדל אם עדיין לא קיימים בפועל - אותו דפוס בדיוק כמו
  // הגדרות התמחור (Calculators.tsx). כל הוספה/מחיקה נשמרת מיד (בלי כפתור
  // שמירה נפרד לכרטיס הזה).
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newAppointmentType, setNewAppointmentType] = useState("");

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    const settingsRef = doc(db, "businessSettings", businessId);
    getDoc(settingsRef)
      .then((snap) => {
        const data = snap.data() as { expenseCategories?: string[]; appointmentTypes?: string[] } | undefined;
        const categories = data?.expenseCategories?.length ? data.expenseCategories : DEFAULT_EXPENSE_CATEGORIES;
        const types = data?.appointmentTypes?.length ? data.appointmentTypes : DEFAULT_APPOINTMENT_TYPES;
        setExpenseCategories(categories);
        setAppointmentTypes(types);
        if (!data?.expenseCategories?.length || !data?.appointmentTypes?.length) {
          setDoc(settingsRef, { expenseCategories: categories, appointmentTypes: types }, { merge: true }).catch(
            (err) => console.error("שגיאה באתחול קטגוריות ברירת מחדל:", err)
          );
        }
      })
      .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const persistCategoryList = async (field: "expenseCategories" | "appointmentTypes", list: string[]) => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    try {
      await setDoc(doc(db, "businessSettings", businessId), { [field]: list }, { merge: true });
    } catch (err) {
      console.error(`שגיאה בשמירת ${field}:`, err);
    }
  };

  const handleAddExpenseCategory = () => {
    const value = newExpenseCategory.trim();
    if (!value || expenseCategories.includes(value)) return;
    const updated = [...expenseCategories, value];
    setExpenseCategories(updated);
    setNewExpenseCategory("");
    persistCategoryList("expenseCategories", updated);
  };

  const handleRemoveExpenseCategory = (category: string) => {
    const updated = expenseCategories.filter((c) => c !== category);
    setExpenseCategories(updated);
    persistCategoryList("expenseCategories", updated);
  };

  const handleAddAppointmentType = () => {
    const value = newAppointmentType.trim();
    if (!value || appointmentTypes.includes(value)) return;
    const updated = [...appointmentTypes, value];
    setAppointmentTypes(updated);
    setNewAppointmentType("");
    persistCategoryList("appointmentTypes", updated);
  };

  const handleRemoveAppointmentType = (type: string) => {
    const updated = appointmentTypes.filter((t) => t !== type);
    setAppointmentTypes(updated);
    persistCategoryList("appointmentTypes", updated);
  };

  // הגדרות תמחור - הועברו לכאן מ-Calculators.tsx (שנשאר צרכן קורא-בלבד
  // עכשיו). אותו מסמך businessSettings/{uid} בדיוק (מיזוג עם
  // expenseCategories/appointmentTypes למעלה - setDoc(merge:true) בכל
  // מקום לא דורס שדות אחרים). כפתור "שמירה" מפורש (לא auto-save בכל
  // הקלדה כמו שהיה ב-Calculators.tsx) - עקבי עם שאר כרטיסי ההגדרות כאן.
  const [pricePerKgUsd, setPricePerKgUsd] = useState(4700);
  const [exchangeRate, setExchangeRate] = useState(3.0);
  const [profitMargin, setProfitMargin] = useState(100);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaveMessage, setPricingSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDoc(doc(db, "businessSettings", businessId))
      .then((snap) => {
        const data = snap.data() as
          | { pricePerKgUsd?: number; exchangeRate?: number; profitMargin?: number }
          | undefined;
        if (data?.pricePerKgUsd != null) setPricePerKgUsd(data.pricePerKgUsd);
        if (data?.exchangeRate != null) setExchangeRate(data.exchangeRate);
        if (data?.profitMargin != null) setProfitMargin(data.profitMargin);
      })
      .catch((err) => console.error("שגיאה בטעינת הגדרות תמחור:", err))
      .finally(() => setPricingLoading(false));
  }, []);

  const handleSavePricing = async () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    setSavingPricing(true);
    setPricingSaveMessage(null);
    try {
      await setDoc(
        doc(db, "businessSettings", businessId),
        { pricePerKgUsd, exchangeRate, profitMargin },
        { merge: true }
      );
      setPricingSaveMessage("success");
    } catch (err) {
      console.error("שגיאה בשמירת הגדרות תמחור:", err);
      setPricingSaveMessage("error");
    } finally {
      setSavingPricing(false);
    }
  };

  // יצוא/גיבוי מלא - שולפת את כל הנתונים של העסק (businessId) מכל
  // ה-collections הרלוונטיים, מאגדת ל-JSON אחד ומורידה כקובץ. חד-פעמי,
  // בלחיצת כפתור - לא נשמר/מועלה לשום מקום, רק Blob מקומי בדפדפן.
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setBackupLoading(true);
    setBackupError(null);
    try {
      const collectionsToExport = ["clients", "orders", "appointments", "hairItems", "bulkItems", "expenses"];
      const backup: Record<string, unknown> = {};

      // Promise.allSettled ולא Promise.all/רצף - כדי שכשל בשליפת collection
      // בודד (למשל בעיית הרשאות/אינדקס ספציפית לאחד מהם) לא יפיל את כל
      // הגיבוי; מציג אזהרה מפורשת עם השם המדויק של מה שנכשל, במקום שגיאה
      // גורפת שלא עוזרת לאבחן איפה בדיוק הבעיה.
      const results = await Promise.allSettled(
        collectionsToExport.map((collectionName) =>
          getDocs(query(collection(db, collectionName), where("businessId", "==", businessId)))
        )
      );
      const failedCollections: string[] = [];
      results.forEach((result, i) => {
        const collectionName = collectionsToExport[i];
        if (result.status === "fulfilled") {
          backup[collectionName] = result.value.docs.map((d) => ({ id: d.id, ...d.data() }));
        } else {
          console.error(`שגיאה בשליפת ${collectionName} לגיבוי:`, result.reason);
          failedCollections.push(collectionName);
          backup[collectionName] = [];
        }
      });

      const [userResult, settingsResult] = await Promise.allSettled([
        getDoc(doc(db, "users", businessId)),
        getDoc(doc(db, "businessSettings", businessId)),
      ]);
      backup.businessProfile =
        userResult.status === "fulfilled" && userResult.value.exists() ? userResult.value.data() : null;
      backup.businessSettings =
        settingsResult.status === "fulfilled" && settingsResult.value.exists() ? settingsResult.value.data() : null;
      backup.exportedAt = new Date().toISOString();

      if (userResult.status === "rejected") console.error("שגיאה בשליפת פרופיל עסק לגיבוי:", userResult.reason);
      if (settingsResult.status === "rejected") console.error("שגיאה בשליפת הגדרות עסק לגיבוי:", settingsResult.reason);

      if (failedCollections.length > 0) {
        setBackupError(
          `הגיבוי ירד, אבל לא ניתן היה לשלוף: ${failedCollections.join(", ")} (שאר הנתונים כן נכללים).`
        );
      }

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `גיבוי-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("שגיאה בהורדת גיבוי:", err);
      const detail = err instanceof Error ? err.message : String(err);
      setBackupError(`שגיאה בהורדת הגיבוי: ${detail}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // מחיקת חשבון - הרסני ובלתי הפיך. שני חסמים לפני שזה בכלל אפשרי:
  // ConfirmDialog (danger) ואז דיאלוג ייעודי שדורש הקלדת "מחקי" מדויקת
  // לפני שכפתור המחיקה הסופי בכלל מתאפשר (לא רק אישור/ביטול רגיל -
  // רמת החומרה כאן מצדיקה חסם נוסף).
  //
  // סדר הפעולות חשוב: קודם מוחקים את כל נתוני Firestore (כשהחשבון
  // עדיין מאומת ותקין), ורק בסוף מוחקים את חשבון ה-Auth עצמו - הפוך
  // היה מסוכן יותר: ברגע ש-deleteUser מצליח, ה-ID token מתבטל כמעט
  // מיד, וכל קריאת Firestore אחריו (שדורשת auth תקין מול הכללים)
  // הייתה נכשלת - משאירה חלק מהנתונים בלי דרך למחוק אותם יותר.
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const businessId = auth.currentUser?.uid;
    const currentUser = auth.currentUser;
    if (!businessId || !currentUser) return;

    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      const collectionsToDelete = ["clients", "orders", "appointments", "hairItems", "bulkItems", "expenses"];
      for (const collectionName of collectionsToDelete) {
        const snap = await getDocs(query(collection(db, collectionName), where("businessId", "==", businessId)));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      await deleteDoc(doc(db, "businessSettings", businessId)).catch(() => {});
      await deleteDoc(doc(db, "users", businessId)).catch(() => {});

      // לוגו ב-Storage - לא קריטי אם נכשל (למשל Storage לא הוקם אצל
      // עסק מסוים, או שאין בכלל לוגו) - לא עוצר את מחיקת שאר הנתונים.
      try {
        const folderRef = ref(storage, `logos/${businessId}`);
        const list = await listAll(folderRef);
        await Promise.all(list.items.map((item) => deleteObject(item)));
      } catch (err) {
        console.error("שגיאה במחיקת לוגו מ-Storage (לא קריטי, ממשיכה):", err);
      }

      // אחרון בכוונה - ראו הסבר למעלה.
      await deleteUser(currentUser);

      onAccountDeleted?.();
    } catch (err) {
      console.error("שגיאה במחיקת חשבון:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setDeleteAccountError(
          "הנתונים נמחקו בהצלחה, אבל מחיקת חשבון ההתחברות עצמו נכשלה - Firebase דורש התחברות טרייה לפעולה רגישה כזו. יש להתנתק (כפתור בסיידבר), להתחבר מחדש, ולנסות שוב את מחיקת החשבון כדי להשלים."
        );
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        setDeleteAccountError(`שגיאה במחיקת החשבון: ${detail}`);
      }
    } finally {
      setDeletingAccount(false);
    }
  };

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
        <h2>🏢 פרופיל העסק</h2>
        {profileLoading ? (
          <p>טוענת פרטי עסק...</p>
        ) : (
          <>
            <div className="settings-logo-row">
              <div className="settings-logo-preview">
                {logoUrl ? <img src={logoUrl} alt="לוגו העסק" /> : <span className="settings-logo-placeholder">אין לוגו</span>}
              </div>
              <div className="settings-logo-actions">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoFileSelected}
                />
                <button
                  type="button"
                  className="btn-google-calendar"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? "מעלה..." : logoUrl ? "החלפת לוגו" : "העלאת לוגו"}
                </button>
                {logoError && <div className="google-calendar-status google-calendar-status--error">{logoError}</div>}
              </div>
            </div>

            <div className="settings-form-grid">
              <div className="settings-field">
                <label>שם העסק</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="settings-field">
                <label>טלפון</label>
                <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="settings-field">
                <label>כתובת</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="settings-field">
                <label>אימייל</label>
                <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            {profileSaveMessage === "success" && (
              <div className="google-calendar-status google-calendar-status--success">הפרטים נשמרו בהצלחה.</div>
            )}
            {profileSaveMessage === "error" && (
              <div className="google-calendar-status google-calendar-status--error">שגיאה בשמירה. נסי שוב.</div>
            )}
            <button type="button" className="btn-google-calendar" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "שומרת..." : "שמירה"}
            </button>
          </>
        )}
      </div>

      <div className="placeholder-card">
        <h2>🗂️ ניהול קטגוריות</h2>
        {categoriesLoading ? (
          <p>טוענת קטגוריות...</p>
        ) : (
          <div className="settings-category-columns">
            <div className="settings-category-column">
              <h3>קטגוריות הוצאות</h3>
              <div className="settings-category-list">
                {expenseCategories.map((cat) => (
                  <div key={cat} className="settings-category-chip">
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseCategory(cat)}
                      aria-label="מחיקת קטגוריה"
                      title="מחיקת קטגוריה"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="settings-category-add-row">
                <input
                  type="text"
                  placeholder="קטגוריה חדשה..."
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddExpenseCategory(); }}
                />
                <button type="button" className="btn-google-calendar" onClick={handleAddExpenseCategory}>
                  הוספה
                </button>
              </div>
            </div>

            <div className="settings-category-column">
              <h3>מטרות פגישה ביומן</h3>
              <div className="settings-category-list">
                {appointmentTypes.map((type) => (
                  <div key={type} className="settings-category-chip">
                    <span>{type}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAppointmentType(type)}
                      aria-label="מחיקת מטרת פגישה"
                      title="מחיקת מטרת פגישה"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="settings-category-add-row">
                <input
                  type="text"
                  placeholder="מטרת פגישה חדשה..."
                  value={newAppointmentType}
                  onChange={(e) => setNewAppointmentType(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddAppointmentType(); }}
                />
                <button type="button" className="btn-google-calendar" onClick={handleAddAppointmentType}>
                  הוספה
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="placeholder-card">
        <h2>💰 הגדרות תמחור</h2>
        {pricingLoading ? (
          <p>טוענת הגדרות תמחור...</p>
        ) : (
          <>
            <div className="settings-form-grid">
              <div className="settings-field">
                <label>מחיר לק"ג ($)</label>
                <input
                  type="number"
                  value={pricePerKgUsd}
                  onChange={(e) => setPricePerKgUsd(Number(e.target.value))}
                />
              </div>
              <div className="settings-field">
                <label>שער יציג</label>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                />
              </div>
              <div className="settings-field">
                <label>% רווח (לדוגמה: 100 עבור 100%)</label>
                <input
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                />
              </div>
            </div>
            {pricingSaveMessage === "success" && (
              <div className="google-calendar-status google-calendar-status--success">הגדרות התמחור נשמרו בהצלחה.</div>
            )}
            {pricingSaveMessage === "error" && (
              <div className="google-calendar-status google-calendar-status--error">שגיאה בשמירה. נסי שוב.</div>
            )}
            <button type="button" className="btn-google-calendar" onClick={handleSavePricing} disabled={savingPricing}>
              {savingPricing ? "שומרת..." : "שמירה"}
            </button>
          </>
        )}
      </div>

      <div className="placeholder-card">
        <h2>💾 יצוא וגיבוי נתונים</h2>
        <p>
          מוריד קובץ JSON אחד עם כל הנתונים של העסק (לקוחות, הזמנות, פגישות,
          מלאי שיער, מלאי פשוט, הוצאות, פרופיל והגדרות) - שמור לעצמך כגיבוי.
        </p>
        {backupError && (
          <div className="google-calendar-status google-calendar-status--error">{backupError}</div>
        )}
        <button type="button" className="btn-google-calendar" onClick={handleDownloadBackup} disabled={backupLoading}>
          {backupLoading ? "מכינה גיבוי..." : "הורד גיבוי מלא"}
        </button>
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

      <div className="placeholder-card settings-danger-zone">
        <h2>⚠️ אזור מסוכן</h2>
        <p>
          מחיקת החשבון היא פעולה הרסנית ובלתי הפיכה - כל הנתונים (לקוחות, הזמנות,
          מלאי, הוצאות, פגישות והגדרות) יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.
        </p>
        {deleteAccountError && (
          <div className="google-calendar-status google-calendar-status--error">{deleteAccountError}</div>
        )}
        <button
          type="button"
          className="settings-delete-account-btn"
          onClick={() => setDeleteAccountDialogOpen(true)}
        >
          מחיקת חשבון
        </button>
      </div>

      {deleteAccountDialogOpen && (
        <div className="confirm-dialog-overlay" onClick={() => !deletingAccount && setDeleteAccountDialogOpen(false)}>
          <div className="confirm-dialog-card confirm-dialog-danger" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">⚠️</div>
            <h2 className="confirm-dialog-title">מחיקת חשבון - לצמיתות</h2>
            <p className="confirm-dialog-message">
              פעולה זו תמחק את כל הנתונים שלך (לקוחות, הזמנות, מלאי, הוצאות,
              פגישות, הגדרות) ואת חשבון ההתחברות עצמו - <strong>לצמיתות, בלי אפשרות שחזור</strong>.
              {"\n\n"}
              כדי לאשר, הקלידי בדיוק את המילה <strong>מחקי</strong> בתיבה למטה.
            </p>
            <input
              type="text"
              className="settings-delete-confirm-input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="הקלידי: מחקי"
              autoFocus
              disabled={deletingAccount}
            />
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDeleteAccountDialogOpen(false);
                  setDeleteConfirmText("");
                }}
                disabled={deletingAccount}
              >
                ביטול
              </button>
              <button
                type="button"
                className="confirm-dialog-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim() !== "מחקי"}
              >
                {deletingAccount ? "מוחקת..." : "מחיקת חשבון לצמיתות"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
