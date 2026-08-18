import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import "./AddClientModal.css";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
};

const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onClientAdded,
}) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
      setSaveError(null);
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addDoc(collection(db, "clients"), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone: form.phone.trim(),
        email: form.email.trim(),
        createdAt: serverTimestamp(),
      });
      onClientAdded();
      onClose();
    } catch (err) {
      console.error("Error adding client:", err);
      setSaveError("שגיאה בשמירת הלקוחה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="add-client-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        dir="rtl"
      >
        <div className="add-client-modal__header">
          <h2 id="modal-title" className="add-client-modal__title">
            לקוחה חדשה
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
            {saving ? <span className="btn__spinner" /> : "הוספי לקוחה"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddClientModal;