// src/pages/Inventory/ShowroomStockFormModal.tsx
// יצירה/עריכה של "פאת תצוגה" - מסמך orders בלי לקוחה (isShowroomStock: true,
// ראו orderCreation.ts). טופס מצומצם: רק שדות המפרט שמשפיעים על אומדן עלות
// השיער (אותם רכיבים/אפשרויות כמו שלב 3 ב-NewOrderWizard) + מחיר מכירה
// מבוקש. שיוך השיער בפועל (usedHairItems) נעשה תמיד דרך AssignHairModal
// הנפרד - הטופס הזה לא נוגע בו בכלל, גם במצב עריכה.
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost, type HairCostSettings } from "../../utils/hairCost";
import { createOrder, type ShowroomSpecs } from "../../utils/orderCreation";
import type { Order } from "../Sales/Sales";

const DEFAULT_HAIR_COST_SETTINGS: HairCostSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0 };

interface ShowroomStockFormModalProps {
  isOpen: boolean;
  editingOrder: Order | null; // null = יצירת פאת תצוגה חדשה, אחרת עריכת הקיימת
  onClose: () => void;
  onSaved: () => void;
}

export default function ShowroomStockFormModal({ isOpen, editingOrder, onClose, onSaved }: ShowroomStockFormModalProps) {
  const [length, setLength] = useState("");
  const [structure, setStructure] = useState("");
  const [fullness, setFullness] = useState("");
  const [color, setColor] = useState("");
  const [retailPrice, setRetailPrice] = useState<number | "">("");
  const [hairCostSettings, setHairCostSettings] = useState<HairCostSettings>(DEFAULT_HAIR_COST_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const specs = editingOrder?.showroomSpecs;
    setLength(specs?.length ?? "");
    setStructure(specs?.structure ?? "");
    setFullness(specs?.fullness ?? "");
    setColor(specs?.color ?? "");
    setRetailPrice(editingOrder?.retailPrice ?? "");
    setError(null);

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDoc(doc(db, "businessSettings", businessId))
      .then((snap) => {
        if (snap.exists()) {
          setHairCostSettings((prev) => ({ ...prev, ...(snap.data() as Partial<HairCostSettings>) }));
        }
      })
      .catch((err) => console.error("Error loading business settings for showroom stock form:", err));
  }, [isOpen, editingOrder]);

  if (!isOpen) return null;

  const hairCostEstimated =
    length && structure && fullness
      ? calculateHairCost({ length: Number(length), structure, fullness }, hairCostSettings).hairCost
      : 0;

  const specsSummary = [
    length ? `אורך: ${length} ס״מ` : null,
    structure ? `מבנה: ${structure}` : null,
    fullness ? `מלאות: ${fullness}` : null,
    color ? `גוון: ${color}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const handleSave = async () => {
    const price = Number(retailPrice) || 0;
    if (price <= 0) {
      setError("יש להזין מחיר מכירה מבוקש תקין.");
      return;
    }

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSaving(true);
    setError(null);

    const showroomSpecs: ShowroomSpecs = { length, structure, fullness, color };

    try {
      if (editingOrder) {
        await updateDoc(doc(db, "orders", editingOrder.id), {
          retailPrice: price,
          notes: specsSummary,
          showroomSpecs,
          hairCostEstimated,
        });
      } else {
        await createOrder({
          businessId,
          clientId: null,
          clientName: null,
          clientPhone: "",
          orderType: "פאת תצוגה",
          totalPrice: 0,
          dueDate: null,
          paymentsCount: 1,
          usedBulkItems: [],
          usedHairItems: [],
          hairCostEstimated,
          notes: specsSummary,
          isShowroomStock: true,
          retailPrice: price,
          showroomSpecs,
        });
      }
      onSaved();
    } catch (err) {
      console.error("Error saving showroom stock order:", err);
      setError("שגיאה בשמירת פאת התצוגה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingOrder ? "עריכת פאת תצוגה" : "יצירת פאת תצוגה חדשה"}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="modal-form-grid">
          <div className="form-field">
            <label>אורך עורף</label>
            <select value={length} onChange={(e) => setLength(e.target.value)}>
              <option value="">בחר...</option>
              {HAIR_LENGTH_OPTIONS.map((v) => (
                <option key={v} value={v}>{v} ס״מ</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>מבנה</label>
            <select value={structure} onChange={(e) => setStructure(e.target.value)}>
              <option value="">בחר...</option>
              {STRUCTURE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>מלאות</label>
            <select value={fullness} onChange={(e) => setFullness(e.target.value)}>
              <option value="">בחר...</option>
              {FULLNESS_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>גוון / צבע</label>
            <input
              type="text"
              placeholder="לדוגמה: חום דבש עם גוונים"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="form-field form-field-full">
            <label>מחיר מכירה מבוקש (₪)</label>
            <input
              type="number"
              min={0}
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        {hairCostEstimated > 0 && (
          <div className="restock-preview">עלות שיער משוערת (גולמית): ₪{hairCostEstimated.toFixed(0)}</div>
        )}

        {error && <span className="field-error">{error}</span>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "שומרת..." : editingOrder ? "שמירת שינויים" : "יצירת פאת תצוגה"}
          </button>
        </div>
      </div>
    </div>
  );
}
