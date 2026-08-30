// src/pages/Inventory/RemnantMergeLogModal.tsx
// יומן המיזוגים של קופסת שאריות ספציפית - כל מיזוג (מאיזה קוקו, כמה גרם,
// כמה שווה, מתי) עם אפשרות "בטל מיזוג" בודד. הולידציה שקובעת אם ביטול
// מותר (לא נעשה שימוש מהקופסה מאז) נמצאת ב-Inventory.tsx (handleUndoMerge) -
// המודל הזה רק מציג ומזמין ביטול, לא מחליט אם הוא מותר.
import React, { useState } from 'react';
import type { HairItem } from '../../types';
import { formatDateIL } from '../../utils/formatDate';

interface RemnantMergeLogModalProps {
  isOpen: boolean;
  box: HairItem | null;
  onClose: () => void;
  onUndo: (index: number) => Promise<void>;
}

const RemnantMergeLogModal: React.FC<RemnantMergeLogModalProps> = ({ isOpen, box, onClose, onUndo }) => {
  const [undoingIndex, setUndoingIndex] = useState<number | null>(null);

  if (!isOpen || !box) return null;

  const log = box.remnantMergeLog ?? [];

  const handleUndoClick = async (index: number) => {
    setUndoingIndex(index);
    try {
      await onUndo(index);
    } finally {
      setUndoingIndex(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card restock-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 יומן מיזוגים - {box.supplier}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="restock-current-info">
          <span>משקל בקופסה כרגע: <strong>{box.currentWeight} גרם</strong></span>
          <span>שווי בקופסה כרגע: <strong>₪{(box.remnantTotalValue ?? 0).toFixed(0)}</strong></span>
        </div>

        {log.length === 0 ? (
          <p className="empty-state">עדיין לא מוזגו קוקוים לקופסה הזו.</p>
        ) : (
          <div className="merge-log-list">
            {log.map((entry, idx) => (
              <div key={idx} className="merge-log-row">
                <div className="merge-log-info">
                  <span className="font-bold">{entry.sourceItemLabel}</span>
                  <span className="mono">{entry.weightMerged} גרם · ₪{entry.valueMerged.toFixed(0)}</span>
                  <span className="merge-log-date">{formatDateIL(entry.mergedAt)}</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary undo-merge-btn"
                  onClick={() => handleUndoClick(idx)}
                  disabled={undoingIndex !== null}
                >
                  {undoingIndex === idx ? 'מבטלת...' : '↩ בטל מיזוג'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemnantMergeLogModal;
