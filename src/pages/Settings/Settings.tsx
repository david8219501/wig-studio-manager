import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../../services/firebase";
import "./Settings.css";

interface BusinessProfile {
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
}

interface SettingsProps {
  user: User | null;
  onLogout: () => void;
}

export default function Settings({ user, onLogout }: SettingsProps) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<BusinessProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as BusinessProfile;
          setProfile(data);
          setForm(data);
        }
      })
      .catch((err) => console.error("Error loading business profile:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user || !form) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
      });
      setProfile(form);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating business profile:", err);
      setSaveError("שגיאה בעדכון הפרטים. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ הגדרות מערכת</h1>
        <p className="subtitle">פרטי העסק, החשבון והתחברות</p>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h2>פרטי העסק והמנהלת</h2>
          {!isEditing && profile && (
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>
              ✏️ עריכת פרטים
            </button>
          )}
        </div>

        {loading && <p className="text-muted">טוען נתונים...</p>}

        {!loading && !profile && (
          <p className="text-muted">לא נמצאו פרטי עסק שמורים עבור החשבון הזה.</p>
        )}

        {!loading && profile && !isEditing && (
          <div className="settings-grid">
            <div className="settings-field">
              <span className="settings-field-label">שם מלא</span>
              <span className="settings-field-value">{profile.firstName} {profile.lastName}</span>
            </div>
            <div className="settings-field">
              <span className="settings-field-label">שם העסק</span>
              <span className="settings-field-value">{profile.businessName}</span>
            </div>
            <div className="settings-field">
              <span className="settings-field-label">טלפון</span>
              <span className="settings-field-value" dir="ltr">{profile.phone}</span>
            </div>
            <div className="settings-field">
              <span className="settings-field-label">אימייל</span>
              <span className="settings-field-value" dir="ltr">{profile.email || user?.email}</span>
            </div>
          </div>
        )}

        {!loading && form && isEditing && (
          <div className="settings-edit-form">
            <div className="settings-grid">
              <div className="settings-field">
                <label className="settings-field-label">שם פרטי</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="settings-field">
                <label className="settings-field-label">שם משפחה</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="settings-field">
                <label className="settings-field-label">שם העסק</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                />
              </div>
              <div className="settings-field">
                <label className="settings-field-label">טלפון</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            {saveError && <div className="settings-error">{saveError}</div>}

            <div className="settings-edit-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setForm(profile);
                  setIsEditing(false);
                  setSaveError(null);
                }}
                disabled={saving}
              >
                ביטול
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "שומר..." : "שמירת שינויים"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-card settings-card-danger">
        <div className="settings-card-header">
          <h2>חשבון והתחברות</h2>
        </div>
        <p className="text-muted">
          את מחוברת כעת עם הכתובת <strong dir="ltr">{user?.email}</strong>.
        </p>

        {!confirmingLogout ? (
          <button className="btn-logout" onClick={() => setConfirmingLogout(true)}>
            🚪 התנתקות מהמערכת
          </button>
        ) : (
          <div className="logout-confirm">
            <span>להתנתק מהחשבון?</span>
            <button className="btn-secondary" onClick={() => setConfirmingLogout(false)}>
              ביטול
            </button>
            <button className="btn-logout" onClick={onLogout}>
              כן, התנתקי אותי
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
