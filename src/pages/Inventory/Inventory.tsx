// src/pages/Inventory/Inventory.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, setDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import type { BulkItem, HairItem } from '../../types';
import AddHairModal from './AddHairModal';
import AddBulkItemModal from './AddBulkItemModal';
import RestockModal from './RestockModal';
import './Inventory.css';

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
  const [hairItems, setHairItems] = useState<HairItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [textureFilter, setTextureFilter] = useState<string>('all'); // סוג שיער / מקור
  const [hairTypeFilter, setHairTypeFilter] = useState<string>('all'); // מרקם
  const [statusFilter, setStatusFilter] = useState<HairItem['status'] | 'all'>('all');
  const [lengthFilter, setLengthFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  // --- מלאי פשוט ---
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [isAddBulkModalOpen, setIsAddBulkModalOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<BulkItem | null>(null);

  // --- האזנה חיה ל-Firestore, מסוננת רק לנתונים של העסק המחובר (businessId = uid) ---
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return; // ליתר ביטחון - אם משום מה אין משתמש מחובר, לא טוענים כלום

    const hairQuery = query(collection(db, 'hairItems'), where('businessId', '==', businessId));
    const unsubHair = onSnapshot(
      hairQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HairItem, 'id'>),
        }));
        setHairItems(items);
      },
      (err) => console.error('Error loading hairItems:', err)
    );

    const bulkQuery = query(collection(db, 'bulkItems'), where('businessId', '==', businessId));
    const unsubBulk = onSnapshot(
      bulkQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BulkItem, 'id'>),
        }));
        setBulkItems(items);
      },
      (err) => console.error('Error loading bulkItems:', err)
    );

    // ניקוי המאזינים ביציאה מהדף, כדי לא להישאר עם חיבורים פתוחים מיותרים
    return () => {
      unsubHair();
      unsubBulk();
    };
  }, []);

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

  // שומרים ל-Firestore עם ה-ID הידידותי שכבר נוצר בטופס (HAIR-1004 וכו'),
  // ומתייגים ב-businessId כדי שהפריט ישויך לעסק המחובר בלבד.
  const handleSaveHairItem = async (item: HairItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'hairItems', id), { ...data, businessId: auth.currentUser!.uid });
    setIsAddModalOpen(false);
  };

  const handleAddBulkItem = async (item: BulkItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'bulkItems', id), { ...data, businessId: auth.currentUser!.uid });
    setIsAddBulkModalOpen(false);
  };

  // ירידה בכמות (צריכה שוטפת) - לא משנה את העלות הממוצעת, רק את הכמות
  const handleUseOne = async (id: string) => {
    const item = bulkItems.find((b) => b.id === id);
    if (!item) return;
    await updateDoc(doc(db, 'bulkItems', id), {
      quantity: Math.max(0, item.quantity - 1),
    });
  };

  // קנייה חדשה - מעדכן גם כמות וגם עלות ממוצעת משוקללת
  const handleConfirmRestock = async (itemId: string, addedQuantity: number, newAverageUnitCost: number) => {
    const item = bulkItems.find((b) => b.id === itemId);
    if (!item) return;
    await updateDoc(doc(db, 'bulkItems', itemId), {
      quantity: item.quantity + addedQuantity,
      unitCost: newAverageUnitCost,
    });
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