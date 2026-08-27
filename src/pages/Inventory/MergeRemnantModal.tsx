// src/pages/Inventory/MergeRemnantModal.tsx
// מיזוג קוקו קטן (שארית) לתוך קופסת שאריות קיימת: מוסיפים את המשקל
// והשווי השיורי שלו לקופסה, ומאפסים אותו (נוצל לגמרי, status: 'depleted').
import React, { useEffect, useState } from 'react';
import type { HairItem } from '../../types';

interface MergeRemnantModalProps {
  isOpen: boolean;
  sourceItem: HairItem | null;
  remnantBoxes: HairItem[];
  onClose: () => void;
  onConfirm: (boxId: string) => Promise<void>;
}

const MergeRemnantModal: React.FC<MergeRemnantModalProps> = ({ isOpen, sourceItem, remnantBoxes, onClose, onConfirm }) => {
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedBoxId(remnantBoxes[0]?.id || '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceItem?.id]);

  if (!isOpen || !sourceItem) return null;

  const remainingValue = sourceItem.costPrice * (sourceItem.currentWeight / sourceItem.initialWeight);

  const handleConfirm = async () => {
    if (!selectedBoxId) {
      setError('יש לבחור קופסת שאריות.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(selectedBoxId);
    } catch (err) {
      console.error('Error merging into remnant box:', err);
      setError('שגיאה במיזוג לקופסה. נסי שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card restock-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>מיזוג לקופסת שאריות - {sourceItem.id}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="restock-current-info">
          <span>משקל שיורי: <strong>{sourceItem.currentWeight} גרם</strong></span>
          <span>שווי שיורי: <strong>₪{remainingValue.toFixed(0)}</strong></span>
        </div>

        {remnantBoxes.length === 0 ? (
          <span className="field-error">
            אין קופסאות שאריות פעילות - יש ליצור קופסה קודם (כפתור "+ צור קופסת שאריות").
          </span>
        ) : (
          <div className="modal-form-grid">
            <div className="form-field form-field-full">
              <label>קופסת שאריות יעד</label>
              <select value={selectedBoxId} onChange={(e) => setSelectedBoxId(e.target.value)}>
                {remnantBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.id} - {box.supplier} ({box.currentWeight} גרם, ₪{(box.remnantTotalValue ?? 0).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && <span className="field-error">{error}</span>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={saving || remnantBoxes.length === 0}>
            {saving ? 'ממזגת...' : 'מזג לקופסה'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeRemnantModal;
