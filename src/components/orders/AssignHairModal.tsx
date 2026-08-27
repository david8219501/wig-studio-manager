import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { HairItem, UsedHairItem } from "../../types";
import "./AssignHairModal.css";

// משקל שיורי קטן מזה נחשב "נגמר" - לא שווה להשאיר את הקוקו זמין לשיוך נוסף
// על שאריות זעירות שלא ניתן לעבוד איתן בפועל.
const DEPLETED_THRESHOLD_GRAMS = 1;

// עלות שיוך גרמים מתוך פריט - לקוקו רגיל: יחסי מ-costPrice/initialWeight (קבוע).
// לקופסת שאריות: יחסי ממחיר ממוצע לגרם דינמי (remnantTotalValue/currentWeight) -
// כי הקופסה מתמלאת ומתרוקנת ממקורות שונים, אין לה עלות/משקל התחלתיים קבועים.
function costForGrams(item: HairItem, grams: number): number {
  if (item.isRemnantBox) {
    return item.currentWeight > 0 ? grams * ((item.remnantTotalValue ?? 0) / item.currentWeight) : 0;
  }
  return item.costPrice * (grams / item.initialWeight);
}

export interface AssignableOrder {
  id: string;
  clientName: string;
  usedHairItems?: UsedHairItem[];
}

interface AssignHairModalProps {
  isOpen: boolean;
  order: AssignableOrder | null;
  onClose: () => void;
}

export default function AssignHairModal({ isOpen, order, onClose }: AssignHairModalProps) {
  const [hairItems, setHairItems] = useState<HairItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedHairItemId, setSelectedHairItemId] = useState("");
  const [gramsUsed, setGramsUsed] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHairItems = () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setLoading(true);
    getDocs(query(collection(db, "hairItems"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        const items: HairItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HairItem, "id">),
        }));
        setHairItems(items);
      })
      .catch((err) => console.error("Error loading hair items for assignment:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen || !order) return;

    setSearch("");
    setSelectedHairItemId("");
    setGramsUsed("");
    setError(null);
    loadHairItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id]);

  const usedHairItems = order?.usedHairItems || [];

  const availableItems = useMemo(
    () =>
      hairItems.filter(
        (h) =>
          h.status === "available" &&
          (search.trim() === "" ||
            h.id.toLowerCase().includes(search.toLowerCase()) ||
            h.color.toLowerCase().includes(search.toLowerCase()))
      ),
    [hairItems, search]
  );

  const selectedItem = useMemo(
    () => availableItems.find((h) => h.id === selectedHairItemId) || null,
    [availableItems, selectedHairItemId]
  );

  const previewCost = useMemo(() => {
    if (!selectedItem || gramsUsed === "" || Number(gramsUsed) <= 0) return null;
    return costForGrams(selectedItem, Number(gramsUsed));
  }, [selectedItem, gramsUsed]);

  const gramsExceedsStock = selectedItem !== null && gramsUsed !== "" && Number(gramsUsed) > selectedItem.currentWeight;

  if (!isOpen || !order) return null;

  const handleAdd = async () => {
    if (!selectedItem || gramsUsed === "" || Number(gramsUsed) <= 0) {
      setError("יש לבחור קוקו ולהזין כמות גרמים תקינה.");
      return;
    }
    if (gramsExceedsStock) {
      setError("הכמות שהוזנה גדולה מהמשקל הזמין בקוקו הנבחר.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const grams = Number(gramsUsed);
      const costAtTime = costForGrams(selectedItem, grams);
      const newCurrentWeight = Math.max(0, selectedItem.currentWeight - grams);
      // רק כשהמשקל השיורי קרוב לאפס הקוקו הופך ללא-זמין; אחרת נשאר 'available'
      // וזמין לשיוך נוסף - זה בדיוק התיקון לבאג שבו שארית קוקו נעלמה מהזמינות.
      const newStatus = newCurrentWeight < DEPLETED_THRESHOLD_GRAMS ? "depleted" : "available";

      const hairItemUpdate: { currentWeight: number; status: HairItem["status"]; remnantTotalValue?: number; lastUsedAt: string } = {
        currentWeight: newCurrentWeight,
        status: newStatus,
        // מתועד תמיד (לא רק לקופסת שאריות) - לא מזיק לקוקו רגיל, ומשמש את
        // הוולידציה של "בטל מיזוג" בקופסת שאריות (Inventory.tsx).
        lastUsedAt: new Date().toISOString(),
      };
      if (selectedItem.isRemnantBox) {
        hairItemUpdate.remnantTotalValue = Math.max(0, (selectedItem.remnantTotalValue ?? 0) - costAtTime);
      }

      await updateDoc(doc(db, "hairItems", selectedItem.id), hairItemUpdate);

      const newUsedHairItems: UsedHairItem[] = [
        ...usedHairItems,
        {
          hairItemId: selectedItem.id,
          hairItemLabel: selectedItem.isRemnantBox
            ? `📦 ${selectedItem.id} · קופסת שאריות (${selectedItem.color})`
            : `${selectedItem.id} · ${selectedItem.color} · ${selectedItem.length} ס״מ`,
          gramsUsed: grams,
          costAtTime,
        },
      ];

      await updateDoc(doc(db, "orders", order.id), { usedHairItems: newUsedHairItems });

      setSelectedHairItemId("");
      setGramsUsed("");
      loadHairItems();
    } catch (err) {
      console.error("Error assigning hair item to order:", err);
      setError("שגיאה בשיוך הקוקו. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    const removed = usedHairItems[index];
    if (!removed) return;

    setSaving(true);
    setError(null);

    try {
      const hairItem = hairItems.find((h) => h.id === removed.hairItemId);
      if (hairItem) {
        const restoreUpdate: { currentWeight: number; status: HairItem["status"]; remnantTotalValue?: number } = {
          currentWeight: hairItem.currentWeight + removed.gramsUsed,
          status: "available",
        };
        // קופסת שאריות: מחזירים גם את השווי שהופחת בזמן השיוך, אחרת
        // remnantTotalValue יישאר חסר לצמיתות אחרי ביטול שיוך.
        if (hairItem.isRemnantBox) {
          restoreUpdate.remnantTotalValue = (hairItem.remnantTotalValue ?? 0) + removed.costAtTime;
        }
        await updateDoc(doc(db, "hairItems", hairItem.id), restoreUpdate);
      }

      const newUsedHairItems = usedHairItems.filter((_, i) => i !== index);
      await updateDoc(doc(db, "orders", order.id), { usedHairItems: newUsedHairItems });

      loadHairItems();
    } catch (err) {
      console.error("Error unassigning hair item from order:", err);
      setError("שגיאה בביטול השיוך. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  const totalActualCost = usedHairItems.reduce((sum, item) => sum + item.costAtTime, 0);

  return (
    <div className="assign-hair-overlay" onClick={onClose}>
      <div className="assign-hair-card" onClick={(e) => e.stopPropagation()}>
        <div className="assign-hair-header">
          <h2>שיוך שיער בפועל</h2>
          <span className="assign-hair-subtitle">הזמנה של {order.clientName}</span>
        </div>

        <div className="assign-hair-body">
          {usedHairItems.length > 0 && (
            <div className="bulk-item-list">
              {usedHairItems.map((used, idx) => (
                <div key={idx} className="bulk-item-row">
                  <span>{used.hairItemLabel} · {used.gramsUsed} גרם</span>
                  <span className="mono">₪{used.costAtTime.toFixed(0)}</span>
                  <button
                    type="button"
                    className="bulk-item-remove-btn"
                    onClick={() => handleRemove(idx)}
                    disabled={saving}
                    aria-label="ביטול שיוך"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="summary-row">
                <span>סה״כ עלות שיער בפועל</span>
                <span className="mono font-bold">₪{totalActualCost.toFixed(0)}</span>
              </div>
            </div>
          )}

          <div className="assign-hair-add-section">
            <label className="assign-hair-add-label">הוספת שיוך קוקו נוסף</label>
            <input
              type="text"
              className="assign-hair-search"
              placeholder="חיפוש לפי מזהה קוקו או גוון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="assign-hair-list">
              {loading && <p>טוענת מלאי שיער...</p>}
              {!loading && availableItems.length === 0 && <p>לא נמצאו קוקוים זמינים במלאי.</p>}
              {!loading &&
                availableItems.map((item) => (
                  <div
                    key={item.id}
                    className={`assign-hair-item ${selectedHairItemId === item.id ? "active" : ""}`}
                    onClick={() => setSelectedHairItemId(item.id)}
                  >
                    {item.isRemnantBox ? (
                      <>
                        <span className="mono font-bold">📦 {item.id}</span>
                        <span>קופסת שאריות · {item.color}</span>
                        <span className="mono">
                          {item.currentWeight} גרם ·{" "}
                          ₪{item.currentWeight > 0 ? ((item.remnantTotalValue ?? 0) / item.currentWeight).toFixed(2) : "0.00"}/גרם
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="mono font-bold">{item.id}</span>
                        <span>{item.color} · {item.length} ס״מ</span>
                        <span className="mono">{item.currentWeight} גרם במלאי</span>
                      </>
                    )}
                  </div>
                ))}
            </div>

            <div className="field">
              <label>גרמים לשימוש בהזמנה זו</label>
              <input
                type="number"
                min={1}
                placeholder="0"
                value={gramsUsed}
                onChange={(e) => setGramsUsed(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            {previewCost !== null && (
              <div className="hair-cost-hint">עלות שיוך זה: ₪{previewCost.toFixed(0)}</div>
            )}
            {gramsExceedsStock && (
              <div className="assign-hair-error">הכמות עולה על המשקל הזמין ({selectedItem?.currentWeight} גרם).</div>
            )}

            <button
              type="button"
              className="btn-secondary assign-hair-add-btn"
              onClick={handleAdd}
              disabled={saving || !selectedItem || gramsUsed === "" || gramsExceedsStock}
            >
              {saving ? "משייכת..." : "+ הוסף שיוך קוקו"}
            </button>
          </div>

          {error && <div className="assign-hair-error">{error}</div>}

          <div className="assign-hair-footer">
            <button type="button" className="btn-primary" onClick={onClose} disabled={saving}>
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
