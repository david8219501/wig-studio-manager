// src/pages/Inventory/AddHairModal.tsx
import React, { useState } from 'react';
import type { HairItem } from '../../types';

interface AddHairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: HairItem) => Promise<void>;
  nextId: string; // התווית הידידותית הבאה לתצוגה, למשל HAIR-05 - לא ה-Firestore document id בפועל (זה auto-generated ב-Inventory.tsx, ראו nextHairCode שם)
  // כשמוגדר - הטופס עובר למצב עריכה. אורך/משקל התחלתי לא ניתנים לעריכה
  // כאן בכוונה (בדיוק כמו quantity ב-AddBulkItemModal) - הם משפיעים על
  // חישובי משקל/שארית שכבר בתוקף על הפריט (currentWeight/remnantTotalValue),
  // ועריכה שקטה שלהם הייתה יוצרת אי-עקביות. currentWeight/status/
  // isRemnantBox/remnantMergeLog/lastUsedAt נשמרים כמו שהם (spread מ-
  // editingItem ב-handleSubmit) - לא נגעים בהם דרך הטופס הזה.
  editingItem?: HairItem | null;
}

// אלו הצעות ברירת מחדל בלבד - השדות הם string חופשי בטיפוס, כך שאפשר גם להקליד ערך אחר
const HAIR_TYPE_OPTIONS = ['חלק', 'גלי', 'מתולתל'];
const TEXTURE_OPTIONS = ['רוסי', 'אירופאי', 'הודי', 'בראזילאי', 'סיני', 'אחר'];

const emptyForm = {
  supplier: '',
  length: '',
  initialWeight: '',
  hairType: HAIR_TYPE_OPTIONS[0],
  texture: TEXTURE_OPTIONS[0],
  color: '',
  costPrice: '',
};

// אתחול ה-form ישירות מ-editingItem (lazy initial state) - בלי useEffect.
// זה תקין רק כי Inventory.tsx מרנדר עם key={editingItem?.id ?? 'new'} -
// מה שגורם ל-React למחזר (remount) את כל הרכיב מחדש בכל פעם שהיעד
// לעריכה משתנה, כך שה-state תמיד מתחיל נקי בלי שום effect.
const formFromItem = (item: HairItem | null): typeof emptyForm =>
  item
    ? {
        supplier: item.supplier,
        length: String(item.length),
        initialWeight: String(item.initialWeight),
        hairType: item.hairType,
        texture: item.texture,
        color: item.color,
        costPrice: String(item.costPrice),
      }
    : emptyForm;

const AddHairModal: React.FC<AddHairModalProps> = ({ isOpen, onClose, onSave, nextId, editingItem = null }) => {
  const [form, setForm] = useState(() => formFromItem(editingItem));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.supplier.trim()) newErrors.supplier = 'שדה חובה';
    if (!form.length || Number(form.length) <= 0) newErrors.length = 'אורך לא תקין';
    if (!form.initialWeight || Number(form.initialWeight) <= 0)
      newErrors.initialWeight = 'משקל לא תקין';
    if (!form.color.trim()) newErrors.color = 'שדה חובה';
    if (!form.costPrice || Number(form.costPrice) < 0) newErrors.costPrice = 'עלות לא תקינה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // עריכה: spread מ-editingItem קודם - שומר currentWeight/status/
    // isRemnantBox/remnantMergeLog/lastUsedAt/createdAt/length/
    // initialWeight כמו שהם, דורס רק את שדות הטופס הניתנים לעריכה.
    const newItem: HairItem = editingItem
      ? {
          ...editingItem,
          supplier: form.supplier.trim(),
          hairType: form.hairType,
          texture: form.texture,
          color: form.color.trim(),
          costPrice: Number(form.costPrice),
        }
      : {
          id: nextId,
          supplier: form.supplier.trim(),
          length: Number(form.length),
          initialWeight: Number(form.initialWeight),
          currentWeight: Number(form.initialWeight), // בקליטה: משקל נוכחי = משקל התחלתי
          hairType: form.hairType,
          texture: form.texture,
          color: form.color.trim(),
          costPrice: Number(form.costPrice),
          status: 'available',
          createdAt: new Date().toISOString(),
        };

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(newItem);
      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      console.error('Error saving hair item:', err);
      setSaveError('שגיאה בשמירת הקוקו. בדקי את החיבור ונסי שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingItem ? 'עריכת פרטי קוקו' : 'קליטת קוקו חדש'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="modal-id-badge">
          {editingItem ? 'מזהה' : 'מזהה שיוקצה אוטומטית'}: <span>{editingItem ? (editingItem.hairCode || editingItem.id) : nextId}</span>
        </div>

        <div className="modal-form-grid">
          <div className="form-field">
            <label>ספק *</label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              placeholder="לדוגמה: יבואן הודי"
            />
            {errors.supplier && <span className="field-error">{errors.supplier}</span>}
          </div>

          {/* אורך/משקל התחלתי לא ניתנים לעריכה - ראו הערה ליד editingItem
              בהגדרת ה-props למעלה. */}
          {!editingItem && (
            <>
              <div className="form-field">
                <label>אורך (ס"מ) *</label>
                <input
                  type="number"
                  value={form.length}
                  onChange={(e) => handleChange('length', e.target.value)}
                  placeholder="40"
                />
                {errors.length && <span className="field-error">{errors.length}</span>}
              </div>

              <div className="form-field">
                <label>משקל התחלתי (גרם) *</label>
                <input
                  type="number"
                  value={form.initialWeight}
                  onChange={(e) => handleChange('initialWeight', e.target.value)}
                  placeholder="120"
                />
                {errors.initialWeight && <span className="field-error">{errors.initialWeight}</span>}
              </div>
            </>
          )}

          <div className="form-field">
            <label>מרקם (חלק/גלי/מתולתל)</label>
            <select value={form.hairType} onChange={(e) => handleChange('hairType', e.target.value)}>
              {HAIR_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>סוג שיער / מקור</label>
            <select value={form.texture} onChange={(e) => handleChange('texture', e.target.value)}>
              {TEXTURE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>גוון/צבע *</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="חום שוקולד"
            />
            {errors.color && <span className="field-error">{errors.color}</span>}
          </div>

          <div className="form-field">
            <label>עלות רכישה (₪) *</label>
            <input
              type="number"
              value={form.costPrice}
              onChange={(e) => handleChange('costPrice', e.target.value)}
              placeholder="850"
            />
            {errors.costPrice && <span className="field-error">{errors.costPrice}</span>}
          </div>
        </div>

        <div className="modal-actions">
          {saveError && <span className="field-error">{saveError}</span>}
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'שומר...' : editingItem ? 'שמירת שינויים' : 'שמור קוקו'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddHairModal;