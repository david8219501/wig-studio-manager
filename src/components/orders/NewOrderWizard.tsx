import React, { useState } from "react";
import "./NewOrderWizard.css";

interface NewOrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderData: any) => void;
}

export default function NewOrderWizard({ isOpen, onClose, onOrderCreated }: NewOrderWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1: סוג הזמנה
  const [orderType, setOrderType] = useState<"new" | "inventory" | "repair" | "other">("new");

  // Step 2: לקוחה
  const [selectedClient, setSelectedClient] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  // Step 3: פרטי הפאה (Chips / Pills)
  const [size, setSize] = useState("M");
  const [texture, setTexture] = useState("גלי");
  const [handwork, setHandwork] = useState("רגיל");
  const [repairs, setRepairs] = useState("לא");
  const [length, setLength] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: תמחיור ותשלומים
  const [price, setPrice] = useState<number | "">(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentsCount, setPaymentsCount] = useState(1);

  if (!isOpen) return null;

  const handleFinish = () => {
    const orderData = {
      orderType,
      selectedClient,
      specs: { size, texture, handwork, repairs, length, color, notes },
      pricing: { price, dueDate, paymentsCount },
      createdAt: new Date().toISOString().split("T")[0],
    };
    onOrderCreated(orderData);
    onClose();
  };

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Navigation */}
        <div className="wizard-header">
          <h2>יצירת הזמנה חדשה</h2>
          <span className="step-indicator">שלב {step} מתוך 4</span>
        </div>

        {/* Step 1: בחירת סוג הזמנה */}
        {step === 1 && (
          <div className="wizard-step">
            <h3>בחרי סוג הזמנה</h3>
            <div className="type-grid">
              <button
                type="button"
                className={`type-card ${orderType === "new" ? "active" : ""}`}
                onClick={() => setOrderType("new")}
              >
                <span className="type-icon">✨</span>
                <span className="type-title">פאה חדשה</span>
              </button>
              <button
                type="button"
                className={`type-card ${orderType === "inventory" ? "active" : ""}`}
                onClick={() => setOrderType("inventory")}
              >
                <span className="type-icon">📦</span>
                <span className="type-title">פאת מלאי</span>
              </button>
              <button
                type="button"
                className={`type-card ${orderType === "repair" ? "active" : ""}`}
                onClick={() => setOrderType("repair")}
              >
                <span className="type-icon">🧵</span>
                <span className="type-title">תיקון / שירות</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: בחירת לקוחה */}
        {step === 2 && (
          <div className="wizard-step">
            <h3>בחירת לקוחה</h3>
            <input
              type="text"
              className="wizard-input"
              placeholder="חיפוש לפי שם או טלפון..."
              value={clientSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSearch(e.target.value)}
            />
            <div className="client-list-preview">
              {["שרה לוי (050-1234567)", "מירי כהן (052-9876543)", "רחלי פרידמן (054-1112233)"]
                .filter((c) => c.includes(clientSearch))
                .map((client, idx) => (
                  <div
                    key={idx}
                    className={`client-item ${selectedClient === client ? "active" : ""}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    👤 {client}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Step 3: מפרט טכני של הפאה (Pills) */}
        {step === 3 && (
          <div className="wizard-step">
            <h3>מפרט הפאה</h3>

            <div className="pill-group">
              <label>מידה:</label>
              <div className="pills">
                {["S", "M", "L", "XL"].map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={`pill ${size === s ? "active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pill-group">
              <label>תנועה:</label>
              <div className="pills">
                {["ישר", "גלי", "מתולתל"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`pill ${texture === t ? "active" : ""}`}
                    onClick={() => setTexture(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="pill-group">
              <label>עבודת יד:</label>
              <div className="pills">
                {["גבוה", "נמוך", "רגיל"].map((h) => (
                  <button
                    type="button"
                    key={h}
                    className={`pill ${handwork === h ? "active" : ""}`}
                    onClick={() => setHandwork(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>אורך (ס"מ)</label>
                <input
                  type="text"
                  placeholder='לדוגמה: 55 ס"מ'
                  value={length}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLength(e.target.value)}
                />
              </div>
              <div className="field">
                <label>גוון / צבע</label>
                <input
                  type="text"
                  placeholder="לדוגמה: חום דבש עם גוונים"
                  value={color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>הערות נוספות</label>
              <textarea
                rows={2}
                placeholder="דגשים מיוחדים לפאה..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: תמחיור ותשלומים */}
        {step === 4 && (
          <div className="wizard-step">
            <h3>תמחיור ותנאי תשלום</h3>
            <div className="form-row">
              <div className="field">
                <label>מחיר ללקוחה (₪)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div className="field">
                <label>תאריך יעד מוכן</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="pill-group">
              <label>מספר תשלומים:</label>
              <div className="pills">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    type="button"
                    key={num}
                    className={`pill ${paymentsCount === num ? "active" : ""}`}
                    onClick={() => setPaymentsCount(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="wizard-footer">
          {step > 1 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
              חזור
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onClose}>
              ביטול
            </button>
          )}

          {step < 4 ? (
            <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>
              הבא
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleFinish}>
              סיום ויצירת הזמנה 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}