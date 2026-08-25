import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { Client } from "../../pages/Clients/Clients";
import "./AddClientModal.css";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: () => void;
  editingClient?: Client | null; // אם יש ערך - הטופס במצב עריכה של לקוחה קיימת
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
};

const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onClientAdded,
  editingClient = null,
}) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = editingClient !== null;

  useEffect(() => {
    if (isOpen) {
      if (editingClient) {
        // מצב עריכה: ממלאים את הטופס עם הנתונים הקיימים של הלקוחה
        const [firstName = "", ...rest] = editingClient.name.split(" ");
        setForm({
          firstName,
          lastName: rest.join(" "),
          phone: editingClient.phone || "",
          email: editingClient.email || "",
          notes: editingClient.notes || "",
        });
      } else {
        setForm(INITIAL_FORM);
      }
      setErrors({});
      setSaveError(null);
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
  }, [isOpen, editingClient]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.firstName.trim()) newErrors.firstName = "שם פרטי הוא שדה חובה";
    if (!form.lastName.trim()) newErrors.lastName = "שם משפחה הוא שדה חובה";
    if (!form.phone.trim()) newErrors.phone = "טלפון הוא שדה חובה";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "כתובת אימייל לא תקינה";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // בדיקה שהטלפון/אימייל לא שייכים כבר ללקוחה אחרת או למנהלת עצמה.
  // מחזירה אובייקט שגיאות (ריק אם הכל תקין).
  const checkDuplicates = async (): Promise<Partial<FormData>> => {
    const dupErrors: Partial<FormData> = {};
    const businessId = auth.currentUser?.uid;
    if (!businessId) return dupErrors;

    const phone = form.phone.trim();
    const email = form.email.trim();

    // 1. השוואה מול פרטי הקשר של המנהלת עצמה (users/{uid})
    const ownerSnap = await getDoc(doc(db, "users", businessId));
    if (ownerSnap.exists()) {
      const owner = ownerSnap.data() as { phone?: string; email?: string };
      if (owner.phone && owner.phone.trim() === phone) {
        dupErrors.phone = "מספר זה זהה למספר הטלפון שלך (המנהלת)";
      }
      if (email && owner.email && owner.email.trim().toLowerCase() === email.toLowerCase()) {
        dupErrors.email = "כתובת זו זהה לכתובת האימייל שלך (המנהלת)";
      }
    }

    // 2. השוואה מול שאר הלקוחות של אותו עסק
    const phoneQuery = query(
      collection(db, "clients"),
      where("businessId", "==", businessId),
      where("phone", "==", phone)
    );
    const phoneSnap = await getDocs(phoneQuery);
    const phoneClash = phoneSnap.docs.some((d) => d.id !== editingClient?.id);
    if (phoneClash) {
      dupErrors.phone = "מספר טלפון זה כבר שייך ללקוחה אחרת";
    }

    if (email) {
      const emailQuery = query(
        collection(db, "clients"),
        where("businessId", "==", businessId),
        where("email", "==", email)
      );
      const emailSnap = await getDocs(emailQuery);
      const emailClash = emailSnap.docs.some((d) => d.id !== editingClient?.id);
      if (emailClash) {
        dupErrors.email = "כתובת אימייל זו כבר שייכת ללקוחה אחרת";
      }
    }

    return dupErrors;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    const dupErrors = await checkDuplicates();
    if (Object.keys(dupErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...dupErrors }));
      setSaving(false);
      return;
    }

    try {
      if (isEditMode && editingClient) {
        // מצב עריכה: מעדכנים את המסמך הקיים, לא יוצרים חדש
        await updateDoc(doc(db, "clients", editingClient.id), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        });
      } else {
        await addDoc(collection(db, "clients"), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
          createdAt: serverTimestamp(),
          businessId: auth.currentUser!.uid,
        });
      }
      onClientAdded();
      onClose();
    } catch (err) {
      console.error("Error saving client:", err);
      setSaveError(isEditMode ? "שגיאה בעדכון הלקוחה. נסי שוב." : "שגיאה בשמירת הלקוחה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="add-client-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="add-client-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        dir="rtl"
      >
        <div className="add-client-modal__header">
          <h2 id="modal-title" className="add-client-modal__title">
            {isEditMode ? "עריכת לקוחה" : "לקוחה חדשה"}
          </h2>
          <button className="add-client-modal__close" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="add-client-modal__body">
          <div className="add-client-modal__grid add-client-modal__grid--2">

            <div className={`field ${errors.firstName ? "field--error" : ""}`}>
              <label className="field__label" htmlFor="firstName">
                שם פרטי <span className="field__required">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="firstName"
                name="firstName"
                type="text"
                className="field__input"
                value={form.firstName}
                onChange={handleChange}
                placeholder="אסתי"
              />
              {errors.firstName && (
                <span className="field__error">{errors.firstName}</span>
              )}
            </div>

            <div className={`field ${errors.lastName ? "field--error" : ""}`}>
              <label className="field__label" htmlFor="lastName">
                שם משפחה <span className="field__required">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className="field__input"
                value={form.lastName}
                onChange={handleChange}
                placeholder="ורטהיימר"
              />
              {errors.lastName && (
                <span className="field__error">{errors.lastName}</span>
              )}
            </div>

            <div className={`field field--full ${errors.phone ? "field--error" : ""}`}>
              <label className="field__label" htmlFor="phone">
                פלאפון <span className="field__required">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="field__input"
                value={form.phone}
                onChange={handleChange}
                placeholder="054-1234567"
                dir="ltr"
              />
              {errors.phone && (
                <span className="field__error">{errors.phone}</span>
              )}
            </div>

            <div className={`field field--full ${errors.email ? "field--error" : ""}`}>
              <label className="field__label" htmlFor="email">
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="field__input"
                value={form.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                dir="ltr"
              />
              {errors.email && (
                <span className="field__error">{errors.email}</span>
              )}
            </div>

            <div className="field field--full">
              <label className="field__label" htmlFor="notes">
                הערות
              </label>
              <textarea
                id="notes"
                name="notes"
                className="field__input field__textarea"
                value={form.notes}
                onChange={handleChange}
                placeholder="העדפות, רגישויות, פרטים חשובים..."
                rows={3}
              />
            </div>
          </div>

          {saveError && (
            <div className="add-client-modal__save-error">{saveError}</div>
          )}
        </div>

        <div className="add-client-modal__footer">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn__spinner" /> : isEditMode ? "שמירת שינויים" : "הוספי לקוחה"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddClientModal;