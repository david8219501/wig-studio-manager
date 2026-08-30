// src/pages/Inventory/AssignBulkItemsModal.tsx
// ניהול פריטי מלאי פשוט (רשת, ראש פאה, קופסה וכו') על פאת תצוגה - אותה
// יכולת "הוסף פריט מהמלאי" שכבר קיימת ב-NewOrderWizard.handleAddUsedBulkItem
// וב-OrderDetailsPanel.tsx (usedBulkItems: itemId/itemName/quantity/
// unitCostAtTime, מוריד כמות בפועל מ-bulkItems), רק כמודל נפרד - כי טבלת
// "פאות תצוגה" ב-Inventory.tsx היא טבלה פשוטה בלי פאנל נשלף כמו OrderDetailsPanel.
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem, UsedBulkItem } from "../../types";
import CustomSelect from "../../components/common/CustomSelect";

export interface BulkAssignableOrder {
  id: string;
  usedBulkItems?: UsedBulkItem[];
}

interface AssignBulkItemsModalProps {
  isOpen: boolean;
  order: BulkAssignableOrder | null;
  onClose: () => void;
}

export default function AssignBulkItemsModal({ isOpen, order, onClose }: AssignBulkItemsModalProps) {
  const [catalog, setCatalog] = useState<BulkItem[]>([]);
  const [pickerId, setPickerId] = useState("");
  const [pickerQty, setPickerQty] = useState<number | "">(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDocs(query(collection(db, "bulkItems"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        setCatalog(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BulkItem, "id">) })));
      })
      .catch((err) => console.error("Error loading bulk items catalog:", err));
  };

  useEffect(() => {
    if (!isOpen || !order) return;
    setPickerId("");
    setPickerQty(1);
    setError(null);
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id]);

  const usedBulkItems = order?.usedBulkItems || [];

  const selectedCatalogItem = useMemo(
    () => catalog.find((b) => b.id === pickerId) || null,
    [catalog, pickerId]
  );

  // וולידציה זהה לדפוס הקיים ב-OrderDetailsPanel.tsx (bulkQtyExceedsStock)
  const qtyExceedsStock = selectedCatalogItem !== null && pickerQty !== "" && Number(pickerQty) > selectedCatalogItem.quantity;

  if (!isOpen || !order) return null;

  const handleAdd = async () => {
    const item = selectedCatalogItem;
    const qty = Number(pickerQty) || 0;
    if (!item || qty <= 0) {
      setError("יש לבחור פריט ולהזין כמות תקינה.");
      return;
    }
    if (qtyExceedsStock) {
      setError(`הכמות שהוזנה גדולה מהמלאי הזמין (${item.quantity}).`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newUsedBulkItems: UsedBulkItem[] = [
        ...usedBulkItems,
        { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
      ];
      await updateDoc(doc(db, "bulkItems", item.id), { quantity: item.quantity - qty });
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });
      setPickerId("");
      setPickerQty(1);
      loadCatalog();
    } catch (err) {
      console.error("Error adding bulk item to showroom stock:", err);
      setError("שגיאה בהוספת הפריט. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    const removed = usedBulkItems[index];
    if (!removed) return;

    setSaving(true);
    setError(null);

    try {
      const catalogItem = catalog.find((b) => b.id === removed.itemId);
      if (catalogItem) {
        await updateDoc(doc(db, "bulkItems", catalogItem.id), { quantity: catalogItem.quantity + removed.quantity });
      }
      const newUsedBulkItems = usedBulkItems.filter((_, i) => i !== index);
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });
      loadCatalog();
    } catch (err) {
      console.error("Error removing bulk item from showroom stock:", err);
      setError("שגיאה בהסרת הפריט. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ניהול פריטי מלאי</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="assign-hair-body">
          {usedBulkItems.length > 0 && (
            <div className="bulk-item-list">
              {usedBulkItems.map((used, idx) => (
                <div key={idx} className="bulk-item-row">
                  <span>{used.itemName} × {used.quantity}</span>
                  <span className="mono">₪{(used.unitCostAtTime * used.quantity).toFixed(0)}</span>
                  <button
                    type="button"
                    className="bulk-item-remove-btn"
                    onClick={() => handleRemove(idx)}
                    disabled={saving}
                    aria-label="הסרת פריט"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="modal-form-grid">
            <div className="form-field form-field-full">
              <label>פריט מהמלאי</label>
              <CustomSelect
                value={pickerId}
                onChange={setPickerId}
                options={catalog.map((b) => ({ value: b.id, label: `${b.name} (במלאי: ${b.quantity})` }))}
                placeholder="בחרי פריט..."
              />
            </div>
            <div className="form-field">
              <label>כמות</label>
              <input
                type="number"
                min={1}
                value={pickerQty}
                onChange={(e) => setPickerQty(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          {qtyExceedsStock && (
            <div className="field-error">הכמות עולה על המלאי הזמין ({selectedCatalogItem?.quantity}).</div>
          )}
          {error && <span className="field-error">{error}</span>}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              סגירה
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={saving || !selectedCatalogItem || pickerQty === "" || qtyExceedsStock}
            >
              {saving ? "מוסיפה..." : "+ הוסף פריט"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
