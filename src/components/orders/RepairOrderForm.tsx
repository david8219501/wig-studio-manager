import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { createOrder } from "../../utils/orderCreation";
import { calculateHairCostFromGrams } from "../../utils/hairCost";
import type { ClientOption } from "./NewOrderWizard";
import "./RepairOrderForm.css";

interface RepairSettings {
  pricePerKgUsd: number;
  exchangeRate: number;
  profitMargin: number;
}

const DEFAULT_SETTINGS: RepairSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0, profitMargin: 100 };

interface RepairOrderFormProps {
  isOpen: boolean;
  client: ClientOption | null;
  onClose: () => void;
  onCreated: () => void;
}

// טופס תיקונים/שירות נפרד ופשוט - מבוסס על אותה נוסחה כמו "מחשבון שדרוגים
// ותיקונים" ב-Calculators.tsx (עלות שיער ישירות מגרמים, בלי אורך/מבנה/מלאות),
// כדי לא להעביר תיקון קטן דרך כל 4 השלבים של אשף ההזמנה החדשה המלאה.
export default function RepairOrderForm({ isOpen, client, onClose, onCreated }: RepairOrderFormProps) {
  const [settings, setSettings] = useState<RepairSettings>(DEFAULT_SETTINGS);
  const [grams, setGrams] = useState<number | "">("");
  const [skinTop, setSkinTop] = useState<number | "">(0);
  const [net, setNet] = useState<number | "">(0);
  const [color, setColor] = useState<number | "">(0);
  const [extra, setExtra] = useState<number | "">(0);
  const [price, setPrice] = useState<number | "">("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setGrams("");
    setSkinTop(0);
    setNet(0);
    setColor(0);
    setExtra(0);
    setPrice("");
    setPriceTouched(false);
    setNotes("");
    setError(null);

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDoc(doc(db, "businessSettings", businessId))
      .then((snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...(snap.data() as Partial<RepairSettings>) }));
        }
      })
      .catch((err) => console.error("Error loading business settings for repair form:", err));
  }, [isOpen]);

  const calc = useMemo(() => {
    if (grams === "" || Number(grams) <= 0) return null;
    const { waste, hairCost } = calculateHairCostFromGrams(Number(grams), settings);
    const mfgCost = hairCost + Number(skinTop || 0) + Number(net || 0) + Number(color || 0) + Number(extra || 0);
    const suggestedPrice = mfgCost * (1 + settings.profitMargin / 100);
    return { waste, hairCost, mfgCost, suggestedPrice };
  }, [grams, skinTop, net, color, extra, settings]);

  // מציעים מחיר אוטומטית לפי הרווח הרצוי, אבל לא דורסים מחיר שהמשתמשת כבר שינתה ידנית
  useEffect(() => {
    if (calc && !priceTouched) {
      setPrice(Math.round(calc.suggestedPrice));
    }
  }, [calc, priceTouched]);

  if (!isOpen || !client) return null;

  const handleCreate = async () => {
    if (!calc) {
      setError("יש להזין כמות גרמים תקינה.");
      return;
    }

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSaving(true);
    setError(null);

    const specsSummary = [
      `גרם שיער: ${grams}`,
      `סקין/טופ: ₪${Number(skinTop || 0)}`,
      `רשת: ₪${Number(net || 0)}`,
      `צבע: ₪${Number(color || 0)}`,
      `נוספות: ₪${Number(extra || 0)}`,
      notes ? `הערות: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      await createOrder({
        businessId,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        orderType: "תיקון / שירות",
        totalPrice: Number(price) || 0,
        dueDate: null,
        paymentsCount: 1,
        usedBulkItems: [],
        usedHairItems: [],
        hairCostEstimated: calc.mfgCost,
        notes: specsSummary,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error("Error creating repair order:", err);
      setError("שגיאה ביצירת הזמנת התיקון. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="repair-order-overlay" onClick={onClose}>
      <div className="repair-order-card" onClick={(e) => e.stopPropagation()}>
        <div className="repair-order-header">
          <h2>הזמנת תיקון / שירות</h2>
          <span className="repair-order-subtitle">עבור {client.name}</span>
        </div>

        <div className="repair-order-body">
          <div className="repair-row">
            <div className="field">
              <label>גרם שיער נדרש</label>
              <input
                type="number"
                min={0}
                placeholder="חובה"
                value={grams}
                onChange={(e) => setGrams(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>סקין/טופ (₪)</label>
              <input type="number" value={skinTop} onChange={(e) => setSkinTop(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="field">
              <label>רשת (₪)</label>
              <input type="number" value={net} onChange={(e) => setNet(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>

          <div className="repair-row">
            <div className="field">
              <label>צבע (₪)</label>
              <input type="number" value={color} onChange={(e) => setColor(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="field">
              <label>נוספות (₪)</label>
              <input type="number" value={extra} onChange={(e) => setExtra(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>

          {calc ? (
            <div className="hair-cost-hint">
              עלות שיער: ₪{calc.hairCost.toFixed(0)} · עלות ייצור כוללת: ₪{calc.mfgCost.toFixed(0)}
            </div>
          ) : (
            <div className="repair-hint">יש להזין כמות גרמים לחישוב עלות השיער</div>
          )}

          <div className="field">
            <label>מחיר ללקוחה (₪)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => {
                setPriceTouched(true);
                setPrice(e.target.value === "" ? "" : Number(e.target.value));
              }}
            />
          </div>

          <div className="field">
            <label>הערות</label>
            <textarea
              rows={2}
              placeholder="פירוט התיקון..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="repair-order-error">{error}</div>}

          <div className="repair-order-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              ביטול
            </button>
            <button type="button" className="btn-primary" onClick={handleCreate} disabled={saving || !calc}>
              {saving ? "יוצרת הזמנה..." : "יצירת הזמנת תיקון"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
