// src/pages/Inventory/RestockModal.tsx
import React, { useMemo, useState } from 'react';
import type { BulkItem } from '../../types';

interface RestockModalProps {
  isOpen: boolean;
  item: BulkItem | null; // הפריט שעליו לוחצים "הוספת מלאי"
  onClose: () => void;
  onConfirm: (itemId: string, addedQuantity: number, newAverageUnitCost: number) => void;
}

const RestockModal: React.FC<RestockModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
  const [addedQuantity, setAddedQuantity] = useState('');
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
  const [error, setError] = useState('');

  // ✅ תקין: כל ה-Hooks מוגדרים בחלק העליון של הקומפוננטה
  // חישוב עלות ממוצעת משוקללת: (כמות ישנה * עלות ישנה + כמות חדשה * עלות קנייה) / סה"כ כמות
  const weightedAverage = useMemo(() => {
    if (!item) return null; // טיפול בטוח למקרה ש-item עדיין null

    const qty = Number(addedQuantity);
    const cost = Number(purchaseUnitCost);
    if (!qty || !cost || qty <= 0 || cost < 0) return null;

    const totalOldValue = item.quantity * item.unitCost;
    const totalNewValue = qty * cost;
    const totalQuantity = item.quantity + qty;

    return totalQuantity > 0 ? (totalOldValue + totalNewValue) / totalQuantity : cost;
  }, [addedQuantity, purchaseUnitCost, item]);

  // ✅ תקין: היציאה המוקדמת מופיעה רק *אחרי* שכל ה-Hooks נקראו
  if (!isOpen || !item) return null;

  const handleClose = () => {
    setAddedQuantity('');
    setPurchaseUnitCost('');
    setError('');
    onClose();
  };

  const handleConfirm = () => {
    const qty = Number(addedQuantity);
    const cost = Number(purchaseUnitCost);

    if (!addedQuantity || qty <= 0) {
      setError('נא להזין כמות תקינה שנוספה');
      return;
    }
    if (purchaseUnitCost === '' || cost < 0) {
      setError('נא להזין עלות ליחידה בקנייה הזו');
      return;
    }

    onConfirm(item.id, qty, weightedAverage ?? cost);
    setAddedQuantity('');
    setPurchaseUnitCost('');
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card restock-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>הוספת מלאי - {item.name}</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="restock-current-info">
          <span>כמות נוכחית: <strong>{item.quantity}</strong></span>
          <span>עלות ממוצעת נוכחית: <strong>₪{item.unitCost.toFixed(2)}</strong></span>
        </div>

        <div className="modal-form-grid">
          <div className="form-field">
            <label>כמות שנוספה *</label>
            <input
              type="number"
              value={addedQuantity}
              onChange={(e) => setAddedQuantity(e.target.value)}
              placeholder="20"
            />
          </div>

          <div className="form-field">
            <label>עלות ליחידה בקנייה זו (₪) *</label>
            <input
              type="number"
              value={purchaseUnitCost}
              onChange={(e) => setPurchaseUnitCost(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>

        {weightedAverage !== null && (
          <div className="restock-preview">
            כמות חדשה במלאי: <strong>{item.quantity + Number(addedQuantity)}</strong>
            {' · '}
            עלות ממוצעת חדשה ליחידה: <strong>₪{weightedAverage.toFixed(2)}</strong>
          </div>
        )}

        {error && <span className="field-error">{error}</span>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClose}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            עדכן מלאי
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestockModal;