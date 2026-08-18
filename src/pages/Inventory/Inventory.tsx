// src/pages/Inventory/Inventory.tsx
import React, { useMemo, useState } from 'react';
import type { BulkItem, HairItem } from '../../types';
import AddHairModal from './AddHairModal';
import AddBulkItemModal from './AddBulkItemModal';
import RestockModal from './RestockModal';
import './Inventory.css';

// --- נתוני דמו זמניים. בשלב הבא נחליף את זה ב-Firestore דרך services/firebase.ts ---
const DEMO_HAIR_ITEMS: HairItem[] = [
  {
    id: 'HAIR-1001',
    supplier: 'יבואן הודי',
    length: 45,
    initialWeight: 130,
    currentWeight: 130,
    hairType: 'גלי',
    texture: 'הודי',
    color: 'חום שוקולד',
    costPrice: 920,
    status: 'available',
    createdAt: '2026-05-12T08:00:00.000Z',
  },
  {
    id: 'HAIR-1002',
    supplier: 'ספק אירופאי',
    length: 60,
    initialWeight: 150,
    currentWeight: 95,
    hairType: 'חלק',
    texture: 'אירופאי',
    color: 'בלונד פלטינה',
    costPrice: 1450,
    status: 'reserved',
    assignedOrderId: 'ORD-2044',
    createdAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'HAIR-1003',
    supplier: 'יבואן הודי',
    length: 35,
    initialWeight: 100,
    currentWeight: 100,
    hairType: 'מתולתל',
    texture: 'רוסי',
    color: 'שחור טבעי',
    costPrice: 780,
    status: 'showroom',
    createdAt: '2026-06-15T08:00:00.000Z',
  },
];

const DEMO_BULK_ITEMS: BulkItem[] = [
  { id: 'BULK-1', name: 'רשת פאה שקופה', quantity: 24, minThreshold: 10, unitCost: 12 },
  { id: 'BULK-2', name: 'סרט הדבקה כפול צדדי', quantity: 6, minThreshold: 8, unitCost: 35 },
  { id: 'BULK-3', name: 'סיכות פאה', quantity: 3, minThreshold: 15, unitCost: 2 },
];

const STATUS_LABELS: Record<HairItem['status'], string> = {
  available: 'זמין',
  reserved: 'משויך להזמנה',
  showroom: 'פאת תצוגה',
  depleted: 'נוצל',
};

type TabKey = 'hair' | 'bulk';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('hair');

  // --- מלאי שיער ---
  const [hairItems, setHairItems] = useState<HairItem[]>(DEMO_HAIR_ITEMS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [textureFilter, setTextureFilter] = useState<string>('all'); // סוג שיער / מקור
  const [hairTypeFilter, setHairTypeFilter] = useState<string>('all'); // מרקם
  const [statusFilter, setStatusFilter] = useState<HairItem['status'] | 'all'>('all');
  const [lengthFilter, setLengthFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  // --- מלאי פשוט ---
  const [bulkItems, setBulkItems] = useState<BulkItem[]>(DEMO_BULK_ITEMS);
  const [isAddBulkModalOpen, setIsAddBulkModalOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<BulkItem | null>(null);

  const nextHairId = useMemo(() => {
    const maxNum = hairItems.reduce((max, item) => {
      const num = parseInt(item.id.replace('HAIR-', ''), 10);
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    return `HAIR-${maxNum + 1}`;
  }, [hairItems]);

  // אפשרויות הפילטר נגזרות מהנתונים בפועל, כדי שהרשימה תישאר מסונכרנת עם מה שבאמת קיים במלאי
  const textureOptions = useMemo(
    () => Array.from(new Set(hairItems.map((item) => item.texture))),
    [hairItems]
  );
  const hairTypeOptions = useMemo(
    () => Array.from(new Set(hairItems.map((item) => item.hairType))),
    [hairItems]
  );

  const filteredHairItems = useMemo(() => {
    return hairItems.filter((item) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTexture = textureFilter === 'all' || item.texture === textureFilter;
      const matchesHairType = hairTypeFilter === 'all' || item.hairType === hairTypeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const matchesLength =
        lengthFilter === 'all' ||
        (lengthFilter === 'short' && item.length < 40) ||
        (lengthFilter === 'medium' && item.length >= 40 && item.length <= 55) ||
        (lengthFilter === 'long' && item.length > 55);

      return matchesSearch && matchesTexture && matchesHairType && matchesStatus && matchesLength;
    });
  }, [hairItems, searchTerm, textureFilter, hairTypeFilter, statusFilter, lengthFilter]);

  const handleSaveHairItem = (item: HairItem) => {
    setHairItems((prev) => [item, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleAddBulkItem = (item: BulkItem) => {
    setBulkItems((prev) => [item, ...prev]);
    setIsAddBulkModalOpen(false);
  };

  // ירידה בכמות (צריכה שוטפת) - לא משנה את העלות הממוצעת, רק את הכמות
  const handleUseOne = (id: string) => {
    setBulkItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
      )
    );
  };

  // קנייה חדשה - מעדכן גם כמות וגם עלות ממוצעת משוקללת
  const handleConfirmRestock = (itemId: string, addedQuantity: number, newAverageUnitCost: number) => {
    setBulkItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: item.quantity + addedQuantity, unitCost: newAverageUnitCost }
          : item
      )
    );
    setRestockTarget(null);
  };

  const statusBadgeClass = (status: HairItem['status']) => `status-badge status-${status}`;

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>ניהול מלאי</h1>
        <div className="tab-switch">
          <button
            className={activeTab === 'hair' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('hair')}
          >
            מלאי שיער ייחודי
          </button>
          <button
            className={activeTab === 'bulk' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('bulk')}
          >
            מלאי פשוט
          </button>
        </div>
      </div>

      {activeTab === 'hair' && (
        <div className="tab-content">
          <div className="filter-bar">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש לפי מזהה, ספק או גוון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select value={textureFilter} onChange={(e) => setTextureFilter(e.target.value)}>
              <option value="all">כל סוגי השיער</option>
              {textureOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select value={hairTypeFilter} onChange={(e) => setHairTypeFilter(e.target.value)}>
              <option value="all">כל המרקמים</option>
              {hairTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={lengthFilter}
              onChange={(e) => setLengthFilter(e.target.value as typeof lengthFilter)}
            >
              <option value="all">כל האורכים</option>
              <option value="short">קצר (עד 40 ס"מ)</option>
              <option value="medium">בינוני (40-55 ס"מ)</option>
              <option value="long">ארוך (מעל 55 ס"מ)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HairItem['status'] | 'all')}
            >
              <option value="all">כל הסטטוסים</option>
              {(Object.keys(STATUS_LABELS) as HairItem['status'][]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <button className="btn-primary add-hair-btn" onClick={() => setIsAddModalOpen(true)}>
              + קליטת קוקו חדש
            </button>
          </div>

          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>מזהה</th>
                  <th>ספק</th>
                  <th>אורך</th>
                  <th>משקל התחלתי</th>
                  <th>משקל נוכחי</th>
                  <th>גוון</th>
                  <th>מרקם</th>
                  <th>סוג שיער</th>
                  <th>עלות רכישה</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filteredHairItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-state">
                      לא נמצאו קוקוים התואמים לסינון
                    </td>
                  </tr>
                ) : (
                  filteredHairItems.map((item) => (
                    <tr key={item.id}>
                      <td className="mono">{item.id}</td>
                      <td>{item.supplier}</td>
                      <td>{item.length} ס"מ</td>
                      <td>{item.initialWeight} גרם</td>
                      <td>{item.currentWeight} גרם</td>
                      <td>{item.color}</td>
                      <td>{item.hairType}</td>
                      <td>{item.texture}</td>
                      <td>₪{item.costPrice.toLocaleString()}</td>
                      <td>
                        <span className={statusBadgeClass(item.status)}>
                          {STATUS_LABELS[item.status]}
                        </span>
                        {item.status === 'reserved' && item.assignedOrderId && (
                          <span className="order-ref">#{item.assignedOrderId}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="tab-content">
          <div className="filter-bar">
            <button className="btn-primary add-hair-btn" onClick={() => setIsAddBulkModalOpen(true)}>
              + מוצר חדש למלאי
            </button>
          </div>

          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>שם הפריט</th>
                  <th>כמות נוכחית</th>
                  <th>סף מינימום</th>
                  <th>עלות ממוצעת ליחידה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {bulkItems.map((item) => {
                  const isLow = item.quantity < item.minThreshold;
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        <span className={isLow ? 'qty-value qty-low' : 'qty-value'}>
                          {item.quantity}
                        </span>
                        {isLow && <span className="low-stock-badge">מלאי נמוך</span>}
                      </td>
                      <td>{item.minThreshold}</td>
                      <td>₪{item.unitCost.toFixed(2)}</td>
                      <td>
                        <div className="qty-controls">
                          <button
                            className="qty-btn"
                            onClick={() => handleUseOne(item.id)}
                            aria-label="הפחת יחידה (שימוש)"
                            title="שימוש ביחידה אחת"
                          >
                            −
                          </button>
                          <button
                            className="btn-secondary restock-btn"
                            onClick={() => setRestockTarget(item)}
                          >
                            + הוספת מלאי
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddHairModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveHairItem}
        nextId={nextHairId}
      />

      <AddBulkItemModal
        isOpen={isAddBulkModalOpen}
        onClose={() => setIsAddBulkModalOpen(false)}
        onSave={handleAddBulkItem}
      />

      <RestockModal
        isOpen={restockTarget !== null}
        item={restockTarget}
        onClose={() => setRestockTarget(null)}
        onConfirm={handleConfirmRestock}
      />
    </div>
  );
};

export default Inventory;