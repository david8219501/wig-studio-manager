// src/pages/Inventory/AddBulkItemModal.tsx
import React, { useMemo, useState } from 'react';
import type { BulkItem } from '../../types';

interface AddBulkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: BulkItem) => Promise<void>;
}

const emptyForm = {
  name: '',
  quantity: '',
  minThreshold: '',
  unitCost: '',
  retailPrice: '',
};

const AddBulkItemModal: React.FC<AddBulkItemModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // רווח ליחידה חי - רק כשגם עלות וגם מחיר מכירה מלאים ותקינים, אותה
  // שפה עיצובית כמו "עלות שיער משוערת" באשף ההזמנה (hair-cost-hint).
  const profitPreview = useMemo(() => {
    if (form.unitCost === '' || form.retailPrice.trim() === '') return null;
    const cost = Number(form.unitCost);
    const retail = Number(form.retailPrice);
    if (cost <= 0 || retail <= 0) return null;
    const profit = retail - cost;
    const marginPct = (profit / cost) * 100;
    return { profit, marginPct };
  }, [form.unitCost, form.retailPrice]);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'שדה חובה';
    if (form.quantity === '' || Number(form.quantity) < 0) newErrors.quantity = 'כמות לא תקינה';
    if (form.minThreshold === '' || Number(form.minThreshold) < 0)
      newErrors.minThreshold = 'סף לא תקין';
    if (form.unitCost === '' || Number(form.unitCost) < 0) newErrors.unitCost = 'עלות לא תקינה';
    if (form.retailPrice !== '' && Number(form.retailPrice) < 0) newErrors.retailPrice = 'מחיר לא תקין';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const newItem: BulkItem = {
      id: `BULK-${Date.now()}`,
      name: form.name.trim(),
      quantity: Number(form.quantity),
      minThreshold: Number(form.minThreshold),
      unitCost: Number(form.unitCost),
      // רק אם הוזן בפועל - שדה אופציונלי; פריט בלי retailPrice הוא חומר
      // ייצור רגיל ולא מקבל כפתור "מכירה מהירה" במלאי.
      ...(form.retailPrice.trim() !== '' ? { retailPrice: Number(form.retailPrice) } : {}),
    };

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(newItem);
      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      console.error('Error saving bulk item:', err);
      setSaveError('שגיאה בשמירת הפריט. בדקי את החיבור ונסי שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>מוצר חדש למלאי הפשוט</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="modal-form-grid">
          <div className="form-field form-field-full">
            <label>שם הפריט *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="לדוגמה: רשת סקין"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-field">
            <label>כמות התחלתית *</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="20"
            />
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </div>

          <div className="form-field">
            <label>סף מינימום להתראה *</label>
            <input
              type="number"
              value={form.minThreshold}
              onChange={(e) => handleChange('minThreshold', e.target.value)}
              placeholder="10"
            />
            {errors.minThreshold && <span className="field-error">{errors.minThreshold}</span>}
          </div>

          <div className="form-section-divider">
            <h3>מחיר ומכירה</h3>
          </div>

          <div className="form-field">
            <label>עלות ליחידה (₪) *</label>
            <input
              type="number"
              value={form.unitCost}
              onChange={(e) => handleChange('unitCost', e.target.value)}
              placeholder="50"
            />
            {errors.unitCost && <span className="field-error">{errors.unitCost}</span>}
          </div>

          <div className="form-field">
            <label>מחיר מכירה (קמעונאי)</label>
            <input
              type="number"
              value={form.retailPrice}
              onChange={(e) => handleChange('retailPrice', e.target.value)}
              placeholder="לדוגמה: 89"
            />
            <span className="form-field-hint">השאירי ריק אם זה חומר ייצור, לא מוצר למכירה ישירה ללקוחות</span>
            {errors.retailPrice && <span className="field-error">{errors.retailPrice}</span>}
          </div>

          {profitPreview && (
            <div className="hair-cost-hint">
              רווח ליחידה: ₪{profitPreview.profit.toFixed(0)} ({profitPreview.marginPct.toFixed(0)}%)
            </div>
          )}
        </div>

        <div className="modal-actions">
          {saveError && <span className="field-error">{saveError}</span>}
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'שומר...' : 'הוסף פריט'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBulkItemModal;