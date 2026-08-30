import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { createOrder } from "../../utils/orderCreation";
import { calculateHairCostFromGrams } from "../../utils/hairCost";
import type { BulkItem, UsedBulkItem } from "../../types";
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

  // פריטי מלאי פשוט שנוצלו בתיקון (רשת, ראש פאה וכו') - אותה יכולת בדיוק
  // כמו ב-NewOrderWizard.tsx (handleAddUsedBulkItem/handleRemoveUsedBulkItem).
  const [bulkItemsCatalog, setBulkItemsCatalog] = useState<BulkItem[]>([]);
  const [usedBulkItems, setUsedBulkItems] = useState<UsedBulkItem[]>([]);
  const [bulkItemPickerId, setBulkItemPickerId] = useState("");
  const [bulkItemPickerQty, setBulkItemPickerQty] = useState<number | "">(1);
  const [bulkItemQtyError, setBulkItemQtyError] = useState<string | null>(null);

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
    setUsedBulkItems([]);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
    setBulkItemQtyError(null);

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDoc(doc(db, "businessSettings", businessId))
      .then((snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...(snap.data() as Partial<RepairSettings>) }));
        }
      })
      .catch((err) => console.error("Error loading business settings for repair form:", err));

    getDocs(query(collection(db, "bulkItems"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        const items: BulkItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BulkItem, "id">),
        }));
        setBulkItemsCatalog(items);
      })
      .catch((err) => console.error("Error loading bulk items for repair form:", err));
  }, [isOpen]);

  // וולידציה זהה לדפוס הקיים ב-NewOrderWizard.tsx/AssignHairModal.tsx/
  // OrderDetailsPanel.tsx - מול המלאי הזמין כולל כמות שכבר נבחרה לאותו
  // פריט קודם באותה הזמנה.
  const handleAddUsedBulkItem = () => {
    const item = bulkItemsCatalog.find((b) => b.id === bulkItemPickerId);
    const qty = Number(bulkItemPickerQty) || 0;
    if (!item || qty <= 0) return;

    const alreadyUsedQty = usedBulkItems
      .filter((used) => used.itemId === item.id)
      .reduce((sum, used) => sum + used.quantity, 0);
    const remaining = item.quantity - alreadyUsedQty;

    if (qty > remaining) {
      setBulkItemQtyError(`הכמות המבוקשת עולה על המלאי הזמין - נותרו רק ${remaining} יח'.`);
      return;
    }

    setBulkItemQtyError(null);
    setUsedBulkItems((prev) => [
      ...prev,
      { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
    ]);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
  };

  const handleRemoveUsedBulkItem = (index: number) => {
    setUsedBulkItems((prev) => prev.filter((_, i) => i !== index));
    setBulkItemQtyError(null);
  };

  const usedBulkItemsCost = usedBulkItems.reduce((sum, u) => sum + u.unitCostAtTime * u.quantity, 0);

  const calc = useMemo(() => {
    if (grams === "" || Number(grams) <= 0) return null;
    const { waste, hairCost } = calculateHairCostFromGrams(Number(grams), settings);
    const mfgCost =
      hairCost + Number(skinTop || 0) + Number(net || 0) + Number(color || 0) + Number(extra || 0) + usedBulkItemsCost;
    const suggestedPrice = mfgCost * (1 + settings.profitMargin / 100);
    return { waste, hairCost, mfgCost, suggestedPrice };
  }, [grams, skinTop, net, color, extra, usedBulkItemsCost, settings]);

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

    // בדיקת הגנה נוספת (defense in depth) - אותו דפוס בדיוק כמו
    // NewOrderWizard.handleFinish: הוולידציה האמיתית כבר קורית ב-
    // handleAddUsedBulkItem, זו רק רשת ביטחון למקרה שהמלאי השתנה במקביל.
    const usedQtyByItemId = new Map<string, number>();
    usedBulkItems.forEach((used) => {
      usedQtyByItemId.set(used.itemId, (usedQtyByItemId.get(used.itemId) ?? 0) + used.quantity);
    });
    for (const [itemId, totalQty] of usedQtyByItemId) {
      const catalogItem = bulkItemsCatalog.find((b) => b.id === itemId);
      if (catalogItem && totalQty > catalogItem.quantity) {
        setError(
          `הכמות המבוקשת מ-"${catalogItem.name}" עולה על המלאי הזמין (נותרו ${catalogItem.quantity}) - ייתכן שהמלאי השתנה. יש לעדכן את הכמות ולנסות שוב.`
        );
        setSaving(false);
        return;
      }
    }

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
        usedBulkItems,
        usedHairItems: [],
        hairCostEstimated: calc.mfgCost,
        notes: specsSummary,
      });

      // הורדת הכמות שנוצלה בפועל מכל פריט מלאי פשוט - מקובצת לפי itemId,
      // אותו דפוס בדיוק כמו NewOrderWizard.handleFinish.
      await Promise.all(
        Array.from(usedQtyByItemId.entries()).map(([itemId, totalQty]) => {
          const catalogItem = bulkItemsCatalog.find((b) => b.id === itemId);
          const remaining = (catalogItem?.quantity ?? totalQty) - totalQty;
          return updateDoc(doc(db, "bulkItems", itemId), { quantity: remaining });
        })
      );

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

          <div className="pill-group">
            <label>פריטי מלאי שנוצלו בתיקון (רשת, ראש פאה וכו'):</label>

            {usedBulkItems.length > 0 && (
              <div className="bulk-item-list">
                {usedBulkItems.map((used, idx) => (
                  <div key={idx} className="bulk-item-row">
                    <span>{used.itemName} × {used.quantity}</span>
                    <span className="mono">₪{(used.unitCostAtTime * used.quantity).toFixed(0)}</span>
                    <button
                      type="button"
                      className="bulk-item-remove-btn"
                      onClick={() => handleRemoveUsedBulkItem(idx)}
                      aria-label="הסרת פריט"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bulk-item-add-row">
              <select
                value={bulkItemPickerId}
                onChange={(e) => {
                  setBulkItemPickerId(e.target.value);
                  setBulkItemQtyError(null);
                }}
              >
                <option value="">בחרי פריט מהמלאי...</option>
                {bulkItemsCatalog.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} (במלאי: {b.quantity})</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={bulkItemPickerQty}
                onChange={(e) => {
                  setBulkItemPickerQty(e.target.value === "" ? "" : Number(e.target.value));
                  setBulkItemQtyError(null);
                }}
              />
              <button type="button" className="btn-secondary" onClick={handleAddUsedBulkItem} disabled={!bulkItemPickerId}>
                + הוסף פריט מהמלאי
              </button>
            </div>
            {bulkItemQtyError && <span className="field-error">{bulkItemQtyError}</span>}
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
