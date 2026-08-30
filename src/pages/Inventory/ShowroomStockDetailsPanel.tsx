// src/pages/Inventory/ShowroomStockDetailsPanel.tsx
// פאנל פרטים נשלף לפאת תצוגה בודדת - נפתח בלחיצה על שורה בטבלת "פאות
// תצוגה" (Inventory.tsx), באותו דפוס עיצובי בדיוק כמו OrderDetailsPanel.tsx
// (overlay + פאנל קבוע מהצד, אנימציית slide-in, וגם אותו מיקום מוטבע
// לפעולות "בתוך" האזור הרלוונטי - לא שורת כפתורים נפרדת), אבל עצמאי
// לגמרי (ShowroomStockDetailsPanel.css משלו) - לא תלוי ב-CSS של קבצים
// אחרים, כמו כל המודלים האחרים בפרויקט.
//
// הוספת/הסרת usedBulkItems מטופלת ישירות כאן (בדיוק כמו ב-
// OrderDetailsPanel.tsx) - אין יותר מודל נפרד לזה. שיוך שיער בפועל
// (usedHairItems) ממשיך להיפתח כ-AssignHairModal חיצוני (onOpenAssignHair)
// כי הרכיב הזה גנרי ומשותף עם הזמנות רגילות - לא הועתק/שוכפל לכאן.
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem, UsedBulkItem } from "../../types";
import type { Order } from "../Sales/Sales";
import CustomSelect from "../../components/common/CustomSelect";
import "./ShowroomStockDetailsPanel.css";

interface ShowroomStockDetailsPanelProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onOpenAssignHair: () => void;
  onOpenEdit: () => void;
  onOpenSell: () => void;
  onDelete: () => void;
}

export default function ShowroomStockDetailsPanel({
  isOpen,
  order,
  onClose,
  onOpenAssignHair,
  onOpenEdit,
  onOpenSell,
  onDelete,
}: ShowroomStockDetailsPanelProps) {
  const [bulkItemsCatalog, setBulkItemsCatalog] = useState<BulkItem[]>([]);
  const [bulkItemPickerId, setBulkItemPickerId] = useState("");
  const [bulkItemPickerQty, setBulkItemPickerQty] = useState<number | "">(1);
  const [savingBulkItem, setSavingBulkItem] = useState(false);
  const [bulkItemError, setBulkItemError] = useState<string | null>(null);

  const loadBulkItemsCatalog = () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDocs(query(collection(db, "bulkItems"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        setBulkItemsCatalog(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BulkItem, "id">) })));
      })
      .catch((err) => console.error("Error loading bulk items catalog for showroom panel:", err));
  };

  useEffect(() => {
    if (!isOpen || !order) return;
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
    setBulkItemError(null);
    loadBulkItemsCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id]);

  const selectedBulkCatalogItem = useMemo(
    () => bulkItemsCatalog.find((b) => b.id === bulkItemPickerId) || null,
    [bulkItemsCatalog, bulkItemPickerId]
  );

  // וולידציה זהה לדפוס הקיים ב-OrderDetailsPanel.tsx (bulkQtyExceedsStock)
  const bulkQtyExceedsStock =
    selectedBulkCatalogItem !== null && bulkItemPickerQty !== "" && Number(bulkItemPickerQty) > selectedBulkCatalogItem.quantity;

  if (!isOpen || !order) return null;

  const usedHairItems = order.usedHairItems ?? [];
  const usedBulkItems = order.usedBulkItems ?? [];
  const actualCost =
    usedHairItems.reduce((sum, u) => sum + u.costAtTime, 0) +
    usedBulkItems.reduce((sum, u) => sum + u.unitCostAtTime * u.quantity, 0);
  const specs = order.showroomSpecs;

  const handleAddBulkItem = async () => {
    const item = selectedBulkCatalogItem;
    const qty = Number(bulkItemPickerQty) || 0;
    if (!item || qty <= 0) {
      setBulkItemError("יש לבחור פריט ולהזין כמות תקינה.");
      return;
    }
    if (qty > item.quantity) {
      setBulkItemError(`הכמות שהוזנה גדולה מהמלאי הזמין (${item.quantity}).`);
      return;
    }

    setSavingBulkItem(true);
    setBulkItemError(null);

    try {
      const newUsedBulkItems: UsedBulkItem[] = [
        ...usedBulkItems,
        { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
      ];
      await updateDoc(doc(db, "bulkItems", item.id), { quantity: item.quantity - qty });
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });
      setBulkItemPickerId("");
      setBulkItemPickerQty(1);
      loadBulkItemsCatalog();
    } catch (err) {
      console.error("Error adding bulk item to showroom stock:", err);
      setBulkItemError("שגיאה בהוספת הפריט. נסי שוב.");
    } finally {
      setSavingBulkItem(false);
    }
  };

  const handleRemoveBulkItem = async (index: number) => {
    const removed = usedBulkItems[index];
    if (!removed) return;

    setSavingBulkItem(true);
    setBulkItemError(null);

    try {
      const catalogItem = bulkItemsCatalog.find((b) => b.id === removed.itemId);
      if (catalogItem) {
        await updateDoc(doc(db, "bulkItems", catalogItem.id), { quantity: catalogItem.quantity + removed.quantity });
      }
      const newUsedBulkItems = usedBulkItems.filter((_, i) => i !== index);
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });
      loadBulkItemsCatalog();
    } catch (err) {
      console.error("Error removing bulk item from showroom stock:", err);
      setBulkItemError("שגיאה בהסרת הפריט. נסי שוב.");
    } finally {
      setSavingBulkItem(false);
    }
  };

  return (
    <>
      <div className="showroom-details-overlay" onClick={onClose} />

      <div className="showroom-details-panel">
        <div className="showroom-details-header">
          <div className="showroom-details-header-right">
            <h2>{order.showroomCode || order.id}</h2>
            <p>פאת תצוגה</p>
          </div>
          <div className="showroom-details-header-left">
            <span className="showroom-details-status-badge">{order.showroomStatus ?? "בבנייה"}</span>
            <button className="showroom-details-close-btn" onClick={onClose} title="סגירה" aria-label="סגירה">
              ✕
            </button>
          </div>
        </div>

        <div className="showroom-details-body">
          <div className="showroom-details-section">
            <h3>מפרט מלא</h3>
            <div className="showroom-details-grid">
              <div className="showroom-detail-box">
                <label>אורך</label>
                <p>{specs?.length ? `${specs.length} ס״מ` : "—"}</p>
              </div>
              <div className="showroom-detail-box">
                <label>מבנה</label>
                <p>{specs?.structure || "—"}</p>
              </div>
              <div className="showroom-detail-box">
                <label>מלאות</label>
                <p>{specs?.fullness || "—"}</p>
              </div>
              <div className="showroom-detail-box">
                <label>גוון</label>
                <p>{specs?.color || "—"}</p>
              </div>
            </div>
          </div>

          <div className="showroom-details-section">
            <div className="showroom-details-section-title-row">
              <h3>שיוך שיער בפועל</h3>
              <button type="button" className="showroom-details-btn-accent" onClick={onOpenAssignHair}>
                🧵 ניהול שיוך שיער
              </button>
            </div>
            {usedHairItems.length === 0 ? (
              <p className="showroom-details-empty">עדיין לא שויך קוקו בפועל לפאה זו.</p>
            ) : (
              <div className="showroom-details-list">
                {usedHairItems.map((used, idx) => (
                  <div key={idx} className="showroom-details-row">
                    <span>{used.hairItemLabel} · {used.gramsUsed} גרם</span>
                    <span className="showroom-details-mono showroom-details-font-bold">₪{used.costAtTime.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="showroom-details-section">
            <h3>פריטי מלאי שנוצלו</h3>
            {usedBulkItems.length === 0 ? (
              <p className="showroom-details-empty">לא נוצלו פריטי מלאי פשוט בפאה זו.</p>
            ) : (
              <div className="showroom-details-list">
                {usedBulkItems.map((used, idx) => (
                  <div key={idx} className="showroom-details-row">
                    <span>{used.itemName} × {used.quantity}</span>
                    <span className="showroom-details-mono showroom-details-font-bold">
                      ₪{(used.unitCostAtTime * used.quantity).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      className="showroom-details-remove-btn"
                      onClick={() => handleRemoveBulkItem(idx)}
                      disabled={savingBulkItem}
                      aria-label="הסרת פריט"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="showroom-details-add-section">
              <label className="showroom-details-add-label">הוספת פריט מהמלאי</label>
              <div className="showroom-details-add-row">
                <CustomSelect
                  value={bulkItemPickerId}
                  onChange={setBulkItemPickerId}
                  options={bulkItemsCatalog.map((b) => ({ value: b.id, label: `${b.name} (במלאי: ${b.quantity})` }))}
                  placeholder="בחרי פריט מהמלאי..."
                />
                <input
                  type="number"
                  min={1}
                  value={bulkItemPickerQty}
                  onChange={(e) => setBulkItemPickerQty(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <button
                  type="button"
                  className="showroom-details-btn-primary"
                  onClick={handleAddBulkItem}
                  disabled={savingBulkItem || !selectedBulkCatalogItem || bulkItemPickerQty === "" || bulkQtyExceedsStock}
                >
                  {savingBulkItem ? "מוסיפה..." : "+ הוסף פריט"}
                </button>
              </div>
              {bulkQtyExceedsStock && (
                <div className="showroom-details-error">הכמות עולה על המלאי הזמין ({selectedBulkCatalogItem?.quantity}).</div>
              )}
              {bulkItemError && <div className="showroom-details-error">{bulkItemError}</div>}
            </div>
          </div>

          <div className="showroom-details-section">
            <h3>תמחור</h3>
            <div className="showroom-details-grid">
              <div className="showroom-detail-box">
                <label>עלות מחושבת כוללת</label>
                <p className="showroom-details-mono showroom-details-font-bold">₪{actualCost.toLocaleString()}</p>
              </div>
              <div className="showroom-detail-box">
                <label>מחיר מכירה מבוקש</label>
                <p className="showroom-details-mono showroom-details-font-bold">₪{(order.retailPrice ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="showroom-details-footer">
          <div className="showroom-details-footer-actions">
            <button type="button" className="showroom-details-btn-secondary" onClick={onOpenEdit}>
              ✏️ עריכה
            </button>
            <button type="button" className="showroom-details-btn-primary" onClick={onOpenSell}>
              💰 מכירה
            </button>
          </div>
          <button type="button" className="showroom-details-btn-danger" onClick={onDelete}>
            🗑️ מחיקה
          </button>
        </div>
      </div>
    </>
  );
}
