// src/pages/Inventory/ShowroomStockDetailsPanel.tsx
// פאנל פרטים נשלף לפאת תצוגה בודדת - נפתח בלחיצה על שורה בטבלת "פאות
// תצוגה" (Inventory.tsx), באותו דפוס עיצובי בדיוק כמו OrderDetailsPanel.tsx
// (overlay + פאנל קבוע מהצד, אנימציית slide-in), אבל עצמאי לגמרי
// (ShowroomStockDetailsPanel.css משלו) - לא תלוי ב-CSS של קבצים אחרים,
// כמו כל המודלים האחרים בפרויקט. הפעולות עצמן (שיוך שיער/פריטי מלאי/
// עריכה/מכירה/מחיקה) עדיין מנוהלות ב-Inventory.tsx - הפאנל רק מציג ומזמין.
import type { Order } from "../Sales/Sales";
import "./ShowroomStockDetailsPanel.css";

interface ShowroomStockDetailsPanelProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onOpenAssignHair: () => void;
  onOpenAssignBulkItems: () => void;
  onOpenEdit: () => void;
  onOpenSell: () => void;
  onDelete: () => void;
}

export default function ShowroomStockDetailsPanel({
  isOpen,
  order,
  onClose,
  onOpenAssignHair,
  onOpenAssignBulkItems,
  onOpenEdit,
  onOpenSell,
  onDelete,
}: ShowroomStockDetailsPanelProps) {
  if (!isOpen || !order) return null;

  const usedHairItems = order.usedHairItems ?? [];
  const usedBulkItems = order.usedBulkItems ?? [];
  const actualCost =
    usedHairItems.reduce((sum, u) => sum + u.costAtTime, 0) +
    usedBulkItems.reduce((sum, u) => sum + u.unitCostAtTime * u.quantity, 0);
  const specs = order.showroomSpecs;

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
            <h3>שיוך שיער בפועל</h3>
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
                  </div>
                ))}
              </div>
            )}
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
            <button type="button" className="showroom-details-btn-accent" onClick={onOpenAssignHair}>
              🧵 ניהול שיוך שיער
            </button>
            <button type="button" className="showroom-details-btn-accent" onClick={onOpenAssignBulkItems}>
              📦 ניהול פריטי מלאי
            </button>
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
