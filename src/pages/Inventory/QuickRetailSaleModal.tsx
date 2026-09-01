// src/pages/Inventory/QuickRetailSaleModal.tsx
// מכירה מהירה של מוצר קמעונאי (לא חומר ייצור) ישירות ממסך המלאי - יוצרת
// "הזמנה" סגורה ומשולמת באותה רגע (status: "delivered"), באותו collection
// orders כמו כל הזמנה אחרת, כדי שתופיע בטבלת Sales ותיכנס לחישובי הרווח
// הקיימים בלי קוד נוסף (usedBulkItems כבר עושה את זה אוטומטית).
import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem } from "../../types";
import type { ClientOption } from "../../components/orders/NewOrderWizard";
import { createOrder } from "../../utils/orderCreation";

interface QuickRetailSaleModalProps {
  isOpen: boolean;
  item: BulkItem | null;
  onClose: () => void;
}

export default function QuickRetailSaleModal({ isOpen, item, onClose }: QuickRetailSaleModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;

    setSelectedClientId("");
    setWalkInName("");
    setQuantity(1);
    setUnitPrice(item.retailPrice ?? "");
    setError(null);

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
      .catch((err) => console.error("Error loading clients for quick retail sale:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const qty = quantity === "" ? 0 : Number(quantity);
  const price = unitPrice === "" ? 0 : Number(unitPrice);
  const total = qty * price;

  const handleConfirm = async () => {
    if (qty <= 0) {
      setError("יש להזין כמות תקינה.");
      return;
    }
    if (qty > item.quantity) {
      setError(`הכמות עולה על המלאי הזמין (${item.quantity}).`);
      return;
    }
    if (unitPrice === "" || price < 0) {
      setError("יש להזין מחיר ליחידה תקין.");
      return;
    }

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSaving(true);
    setError(null);

    const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
    const clientName = selectedClient ? selectedClient.name : walkInName.trim() || "לקוחה מזדמנת";
    const clientPhone = selectedClient ? selectedClient.phone : "";
    const today = new Date().toISOString().split("T")[0];

    try {
      await createOrder({
        businessId,
        clientId: selectedClient ? selectedClient.id : null,
        clientName,
        clientPhone,
        orderType: "מוצר קמעונאי",
        totalPrice: total,
        dueDate: null,
        usedBulkItems: [
          { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
        ],
        usedHairItems: [],
        hairCostEstimated: 0,
        notes: "",
        status: "delivered",
        paidAmount: total,
        payments: [{ amount: total, method: "cash", date: today }],
      });

      await updateDoc(doc(db, "bulkItems", item.id), {
        quantity: Math.max(0, item.quantity - qty),
      });

      onClose();
    } catch (err) {
      console.error("Error creating quick retail sale:", err);
      setError("שגיאה ביצירת המכירה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>מכירה מהירה - {item.name}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="modal-form-grid">
          <div className="form-field form-field-full">
            <label>לקוחה</label>
            <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
              <option value="">ללא לקוחה / לקוחה מזדמנת</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          {!selectedClientId && (
            <div className="form-field form-field-full">
              <label>שם לקוחה מזדמנת (אופציונלי)</label>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="לקוחה מזדמנת"
              />
            </div>
          )}

          <div className="form-field">
            <label>כמות</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="form-field">
            <label>מחיר ליחידה (₪)</label>
            <input
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="restock-preview">
          סה"כ לתשלום: <strong>₪{total.toLocaleString()}</strong> · במלאי כרגע: {item.quantity}
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
