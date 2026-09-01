// src/pages/Inventory/SellShowroomStockModal.tsx
// השלמת מכירה בפועל של פאת תצוגה: בוחרים לקוחה ומאשרים/מעדכנים את המחיר
// הסופי, ואז מעדכנים (updateDoc) את אותו מסמך orders במקום ליצור חדש -
// clientId/clientName נקבעים, status הופך ל-"delivered" (מסירה מיידית,
// כמו QuickRetailSaleModal), isShowroomStock נשאר true לצורך תיעוד היסטורי.
// מרגע זה ה-order כבר לא מוצג בלשונית "פאות תצוגה" (יש לו clientId), אלא
// בטבלת המכירות הרגילה כמו כל הזמנה אחרת.
import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { ClientOption } from "../../components/orders/NewOrderWizard";
import type { Order } from "../Sales/Sales";

interface SellShowroomStockModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSold: () => void;
  // אם נפתח מתוך ClientDrawer של לקוחה ספציפית (דרך NewOrderWizard) - הלקוחה
  // כבר ידועה מראש, אז מדלגים על ה-dropdown לגמרי, בדיוק כמו preselectedClient
  // ב-NewOrderWizard.tsx.
  preselectedClient?: ClientOption | null;
}

export default function SellShowroomStockModal({ isOpen, order, onClose, onSold, preselectedClient = null }: SellShowroomStockModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [finalPrice, setFinalPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order) return;

    setFinalPrice(order.retailPrice ?? "");
    setError(null);

    if (preselectedClient) {
      setSelectedClientId(preselectedClient.id);
      setClients([preselectedClient]);
      return;
    }

    setSelectedClientId("");

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDocs(query(collection(db, "clients"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        const list: ClientOption[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as { name?: string; phone?: string };
          return { id: docSnap.id, name: data.name || "", phone: data.phone || "" };
        });
        setClients(list);
      })
      .catch((err) => console.error("Error loading clients for showroom stock sale:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id, preselectedClient]);

  if (!isOpen || !order) return null;

  const price = finalPrice === "" ? 0 : Number(finalPrice);

  const handleConfirm = async () => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) {
      setError("יש לבחור לקוחה.");
      return;
    }
    if (finalPrice === "" || price <= 0) {
      setError("יש להזין מחיר מכירה סופי תקין.");
      return;
    }

    setSaving(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    try {
      await updateDoc(doc(db, "orders", order.id), {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        totalPrice: price,
        paidAmount: price,
        status: "delivered",
        payments: [{ amount: price, method: "cash", date: today }],
      });
      onSold();
    } catch (err) {
      console.error("Error completing showroom stock sale:", err);
      setError("שגיאה בהשלמת המכירה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>מכירת פאת תצוגה</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        {order.notes && <div className="restock-preview">{order.notes}</div>}

        <div className="modal-form-grid">
          <div className="form-field form-field-full">
            <label>לקוחה</label>
            {preselectedClient ? (
              <div className="restock-preview">👤 {preselectedClient.name} ({preselectedClient.phone})</div>
            ) : (
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">בחרי לקוחה...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-field form-field-full">
            <label>מחיר מכירה סופי (₪)</label>
            <input
              type="number"
              min={0}
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        {error && <span className="field-error">{error}</span>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? "מוכרת..." : "💰 אישור מכירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
