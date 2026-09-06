// src/pages/Inventory/HairItemDetailsPanel.tsx
// פאנל פרטים נשלף לפריט מלאי שיער בודד - נפתח בלחיצה על שורה בטבלת "מלאי
// שיער ייחודי" (Inventory.tsx), אחרי שהטבלה עצמה צומצמה ל-5 עמודות (מזהה/
// גוון/אורך/משקל נוכחי/סטטוס) - אותו דפוס עיצובי בדיוק כמו
// ShowroomStockDetailsPanel.tsx/OrderDetailsPanel.tsx (overlay + פאנל קבוע
// מהצד, אנימציית slide-in), אבל עצמאי לגמרי (HairItemDetailsPanel.css
// משלו) - לא תלוי ב-CSS של קבצים אחרים.
//
// לוגיקת המיזוג/עריכה עצמה נשארת ב-Inventory.tsx (onMerge/onViewMergeLog/
// onEdit) - הרכיב הזה רק מציג ומעביר הלאה, בדיוק כמו onOpenAssignHair/
// onOpenEdit ב-ShowroomStockDetailsPanel.
//
// "מכירה" לא מופיעה כאן: HairItem['status'] כולל 'sold'/'showroom', אבל
// אף מקום בקוד לא מגדיר סטטוס כזה בפועל על hairItems רגילים היום (0
// מופעים אמיתיים) - אין תרחיש שבו "מכירה" רלוונטית לפריט הזה כרגע.
import type { HairItem } from "../../types";
import "./HairItemDetailsPanel.css";

const STATUS_LABELS: Record<HairItem["status"], string> = {
  available: "זמין",
  showroom: "פאת תצוגה",
  sold: "נמכרה",
  depleted: "נוצל",
};

interface HairItemDetailsPanelProps {
  isOpen: boolean;
  item: HairItem | null;
  onClose: () => void;
  onMerge: () => void;
  onViewMergeLog: () => void;
  onEdit: () => void;
}

export default function HairItemDetailsPanel({
  isOpen,
  item,
  onClose,
  onMerge,
  onViewMergeLog,
  onEdit,
}: HairItemDetailsPanelProps) {
  if (!isOpen || !item) return null;

  const isRemnant = item.isRemnantBox === true;
  const canMerge = !isRemnant && item.currentWeight > 0;
  const avgPricePerGram = isRemnant && item.currentWeight > 0 ? (item.remnantTotalValue ?? 0) / item.currentWeight : 0;

  return (
    <>
      <div className="hair-details-overlay" onClick={onClose} />

      <div className="hair-details-panel">
        <div className="hair-details-header">
          <div className="hair-details-header-right">
            <h2>{item.hairCode || item.id}</h2>
            <p>{isRemnant ? "קופסת שאריות" : "מלאי שיער ייחודי"}</p>
          </div>
          <div className="hair-details-header-left">
            <span className={`status-badge status-${item.status}`}>{STATUS_LABELS[item.status]}</span>
            <button className="hair-details-close-btn" onClick={onClose} title="סגירה" aria-label="סגירה">
              ✕
            </button>
          </div>
        </div>

        <div className="hair-details-body">
          <div className="hair-details-section">
            <h3>פרטים מלאים</h3>
            <div className="hair-details-grid">
              <div className="hair-detail-box">
                <label>ספק</label>
                <p>{isRemnant && "📦 "}{item.supplier}</p>
              </div>
              <div className="hair-detail-box">
                <label>אורך</label>
                <p>{isRemnant ? "—" : `${item.length} ס"מ`}</p>
              </div>
              <div className="hair-detail-box">
                <label>משקל התחלתי</label>
                <p>{isRemnant ? "—" : `${item.initialWeight} גרם`}</p>
              </div>
              <div className="hair-detail-box">
                <label>מרקם</label>
                <p>{isRemnant ? "—" : item.hairType}</p>
              </div>
              <div className="hair-detail-box">
                <label>סוג שיער</label>
                <p>{isRemnant ? "—" : item.texture}</p>
              </div>
              <div className="hair-detail-box">
                <label>{isRemnant ? "מחיר ממוצע לגרם" : "עלות רכישה"}</label>
                <p className="hair-details-mono hair-details-font-bold">
                  {isRemnant ? `₪${avgPricePerGram.toFixed(2)}` : `₪${item.costPrice.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hair-details-footer">
          <div className="hair-details-footer-actions">
            {canMerge && (
              <button type="button" className="hair-details-btn-secondary" onClick={onMerge}>
                📦 מזג לשאריות
              </button>
            )}
            {isRemnant && (
              <button type="button" className="hair-details-btn-secondary" onClick={onViewMergeLog}>
                📋 יומן מיזוגים{item.remnantMergeLog?.length ? ` (${item.remnantMergeLog.length})` : ""}
              </button>
            )}
            <button type="button" className="hair-details-btn-secondary" onClick={onEdit}>
              ✏️ עריכה
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
