// src/pages/Inventory/CreateRemnantBoxModal.tsx
// יצירת "קופסת שאריות" - hairItem מיוחד (isRemnantBox: true) שאין לו עלות/משקל
// התחלתיים משלו; הוא נולד ריק ומתמלא לאורך זמן ממיזוג שאריות קוקוים קטנים
// (ראו MergeRemnantModal.tsx). לכן, בשונה מ-AddHairModal, אין כאן שדות
// ספק/אורך/משקל/מרקם/עלות - רק שם וגוון/תיאור חופשיים.
import React, { useState } from 'react';
import type { HairItem } from '../../types';

interface CreateRemnantBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: HairItem) => Promise<void>;
  nextId: string;
}

const emptyForm = { name: '', color: '' };

const CreateRemnantBoxModal: React.FC<CreateRemnantBoxModalProps> = ({ isOpen, onClose, onSave, nextId }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'שדה חובה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const newItem: HairItem = {
      id: nextId,
      supplier: form.name.trim(),
      length: 0,
      initialWeight: 0,
      currentWeight: 0,
      hairType: '-',
      texture: '-',
      color: form.color.trim() || 'שאריות מעורבות',
      costPrice: 0,
      status: 'available',
      isRemnantBox: true,
      remnantTotalValue: 0,
      createdAt: new Date().toISOString(),
    };

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(newItem);
      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      console.error('Error creating remnant box:', err);
      setSaveError('שגיאה ביצירת הקופסה. נסי שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card restock-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📦 קופסת איחוד שיער חדשה</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="modal-id-badge">
          מזהה שיוקצה אוטומטית: <span>{nextId}</span>
        </div>

        <div className="modal-form-grid">
          <div className="form-field form-field-full">
            <label>שם הקופסה *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="לדוגמה: קופסת איחוד שיער - חום"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-field form-field-full">
            <label>גוון / תיאור</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="לדוגמה: גוונים חומים מעורבים"
            />
          </div>
        </div>

        <div className="modal-actions">
          {saveError && <span className="field-error">{saveError}</span>}
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'יוצרת...' : 'צור קופסה'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRemnantBoxModal;
