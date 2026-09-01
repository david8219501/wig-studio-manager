import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem, OrderPayment, UsedBulkItem } from "../../types";
import type { Order } from "../../pages/Sales/Sales";
import { formatDateIL } from "../../utils/formatDate";
import DateInput from "../common/DateInput";
import ConfirmDialog from "../common/ConfirmDialog";
import "./OrderDetailsPanel.css";

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  new: "חדשה",
  in_progress: "בטיפול",
  styling: "בסירוק",
  ready: "מוכנה",
  delivered: "נמסרה",
};

const PAYMENT_METHOD_LABELS: Record<OrderPayment["method"], string> = {
  cash: "💵 מזומן",
  credit: "💳 אשראי",
  transfer: "🏦 העברה",
  check: "📜 צ'ק",
};

interface OrderDetailsPanelProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onOpenAssignHair: (orderId: string) => void;
}

// פאנל פרטים נשלף להזמנה בודדת - נפתח בלחיצה על שורה בטבלת Sales, באותו
// דפוס עיצובי כמו ClientDrawer (overlay + פאנל קבוע מהצד), אבל עצמאי
// (CSS משלו) כי מציג מידע שונה לגמרי (פירוט הזמנה, לא כרטיס לקוחה).
export default function OrderDetailsPanel({ isOpen, order, onClose, onOpenAssignHair }: OrderDetailsPanelProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState<OrderPayment["method"]>("cash");
  const [payDate, setPayDate] = useState(todayStr);
  const [payNote, setPayNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // עריכה/מחיקה של תשלום בודד מהיסטוריית התשלומים - אותו דפוס "לחיצה
  // לעריכה בשורה" כמו הוספת/הסרת פריטי מלאי למעלה, פלוס ConfirmDialog
  // למחיקה (במקום window.confirm).
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editPayAmount, setEditPayAmount] = useState<number | "">("");
  const [editPayMethod, setEditPayMethod] = useState<OrderPayment["method"]>("cash");
  const [editPayDate, setEditPayDate] = useState(todayStr);
  const [editPayNote, setEditPayNote] = useState("");
  const [savingEditPayment, setSavingEditPayment] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);
  const [deletingPaymentIndex, setDeletingPaymentIndex] = useState<number | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);

  // הוספת פריט מלאי פשוט (רשת, ראש פאה וכו') להזמנה קיימת - אותו דפוס
  // "הוסף עוד" כמו ניהול שיוך שיער (AssignHairModal), רק בתוך הפאנל עצמו.
  const [bulkItemsCatalog, setBulkItemsCatalog] = useState<BulkItem[]>([]);
  const [bulkItemPickerId, setBulkItemPickerId] = useState("");
  const [bulkItemPickerQty, setBulkItemPickerQty] = useState<number | "">(1);
  const [savingBulkItem, setSavingBulkItem] = useState(false);
  const [bulkItemError, setBulkItemError] = useState<string | null>(null);

  const loadBulkItemsCatalog = () => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    getDocs(query(collection(db, "bulkItems"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        const items: BulkItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BulkItem, "id">),
        }));
        setBulkItemsCatalog(items);
      })
      .catch((err) => console.error("Error loading bulk items catalog for order panel:", err));
  };

  useEffect(() => {
    if (!isOpen) return;
    setPayAmount("");
    setPayMethod("cash");
    setPayDate(todayStr);
    setPayNote("");
    setPaymentError(null);
    setEditingPaymentIndex(null);
    setEditPaymentError(null);
    setDeletingPaymentIndex(null);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
    setBulkItemError(null);
    loadBulkItemsCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id]);

  const selectedBulkCatalogItem = useMemo(
    () => bulkItemsCatalog.find((b) => b.id === bulkItemPickerId) || null,
    [bulkItemsCatalog, bulkItemPickerId]
  );

  const bulkQtyExceedsStock =
    selectedBulkCatalogItem !== null && bulkItemPickerQty !== "" && Number(bulkItemPickerQty) > selectedBulkCatalogItem.quantity;

  if (!isOpen || !order) return null;

  const debt = (order.totalPrice || 0) - (order.paidAmount || 0);
  const usedBulkItems = order.usedBulkItems || [];
  const usedHairItems = order.usedHairItems || [];
  const payments = order.payments || [];

  const handleAddPayment = async () => {
    if (payAmount === "" || Number(payAmount) <= 0) {
      setPaymentError("יש להזין סכום תשלום תקין.");
      return;
    }

    setSavingPayment(true);
    setPaymentError(null);

    const note = payNote.trim();
    const newPayment: OrderPayment = note
      ? { amount: Number(payAmount), method: payMethod, date: payDate || todayStr, note }
      : { amount: Number(payAmount), method: payMethod, date: payDate || todayStr };

    const newPayments = [...payments, newPayment];
    const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await updateDoc(doc(db, "orders", order.id), {
        payments: newPayments,
        paidAmount: newPaidAmount,
      });
      setPayAmount("");
      setPayNote("");
      setPayMethod("cash");
      setPayDate(todayStr);
    } catch (err) {
      console.error("Error adding payment:", err);
      setPaymentError("שגיאה בהוספת התשלום. נסי שוב.");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleStartEditPayment = (idx: number) => {
    const p = payments[idx];
    if (!p) return;
    setEditingPaymentIndex(idx);
    setEditPayAmount(p.amount);
    setEditPayMethod(p.method);
    setEditPayDate(p.date);
    setEditPayNote(p.note || "");
    setEditPaymentError(null);
  };

  const handleCancelEditPayment = () => {
    setEditingPaymentIndex(null);
    setEditPaymentError(null);
  };

  const handleSaveEditPayment = async (idx: number) => {
    if (editPayAmount === "" || Number(editPayAmount) <= 0) {
      setEditPaymentError("יש להזין סכום תשלום תקין.");
      return;
    }

    setSavingEditPayment(true);
    setEditPaymentError(null);

    const note = editPayNote.trim();
    const updatedPayment: OrderPayment = note
      ? { amount: Number(editPayAmount), method: editPayMethod, date: editPayDate || todayStr, note }
      : { amount: Number(editPayAmount), method: editPayMethod, date: editPayDate || todayStr };

    const newPayments = payments.map((p, i) => (i === idx ? updatedPayment : p));
    const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await updateDoc(doc(db, "orders", order.id), {
        payments: newPayments,
        paidAmount: newPaidAmount,
      });
      setEditingPaymentIndex(null);
    } catch (err) {
      console.error("Error editing payment:", err);
      setEditPaymentError("שגיאה בעדכון התשלום. נסי שוב.");
    } finally {
      setSavingEditPayment(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (deletingPaymentIndex === null) return;

    setDeletingPayment(true);

    const newPayments = payments.filter((_, i) => i !== deletingPaymentIndex);
    const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await updateDoc(doc(db, "orders", order.id), {
        payments: newPayments,
        paidAmount: newPaidAmount,
      });
      setDeletingPaymentIndex(null);
      if (editingPaymentIndex === deletingPaymentIndex) {
        setEditingPaymentIndex(null);
      }
    } catch (err) {
      console.error("Error deleting payment:", err);
    } finally {
      setDeletingPayment(false);
    }
  };

  const handleAddBulkItem = async () => {
    const item = selectedBulkCatalogItem;
    const qty = Number(bulkItemPickerQty) || 0;
    if (!item || qty <= 0) {
      setBulkItemError("יש לבחור פריט ולהזין כמות תקינה.");
      return;
    }
    if (qty > item.quantity) {
      setBulkItemError(`הכמות שהוזנה גדולה מהמלאי הזמין (${item.quantity}).`);
      return;
    }

    setSavingBulkItem(true);
    setBulkItemError(null);

    try {
      const newUsedBulkItems: UsedBulkItem[] = [
        ...usedBulkItems,
        { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
      ];

      await updateDoc(doc(db, "bulkItems", item.id), { quantity: item.quantity - qty });
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });

      setBulkItemPickerId("");
      setBulkItemPickerQty(1);
      loadBulkItemsCatalog();
    } catch (err) {
      console.error("Error adding bulk item to order:", err);
      setBulkItemError("שגיאה בהוספת הפריט. נסי שוב.");
    } finally {
      setSavingBulkItem(false);
    }
  };

  const handleRemoveBulkItem = async (index: number) => {
    const removed = usedBulkItems[index];
    if (!removed) return;

    setSavingBulkItem(true);
    setBulkItemError(null);

    try {
      const catalogItem = bulkItemsCatalog.find((b) => b.id === removed.itemId);
      if (catalogItem) {
        await updateDoc(doc(db, "bulkItems", catalogItem.id), { quantity: catalogItem.quantity + removed.quantity });
      }

      const newUsedBulkItems = usedBulkItems.filter((_, i) => i !== index);
      await updateDoc(doc(db, "orders", order.id), { usedBulkItems: newUsedBulkItems });

      loadBulkItemsCatalog();
    } catch (err) {
      console.error("Error removing bulk item from order:", err);
      setBulkItemError("שגיאה בהסרת הפריט. נסי שוב.");
    } finally {
      setSavingBulkItem(false);
    }
  };

  return (
    <>
      <div className="order-details-overlay" onClick={onClose} />

      <div className="order-details-panel">
        <div className="order-details-header">
          <div className="order-details-header-right">
            <h2>{order.clientName}</h2>
            <p className="mono" dir="ltr">{order.clientPhone}</p>
          </div>
          <div className="order-details-header-left">
            <span className={`badge order-status-badge status-${order.status}`}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
            <button className="btn-close" onClick={onClose} title="סגירה" aria-label="סגירה">
              ✕
            </button>
          </div>
        </div>

        <div className="order-details-body">
          <div className="order-details-section">
            <h3>פרטי הזמנה</h3>
            <div className="order-details-grid">
              <div className="order-detail-box">
                <label>סוג עבודה</label>
                <p>{order.orderType || "פאה חדשה"}</p>
              </div>
              <div className="order-detail-box">
                <label>תאריך יצירה</label>
                <p className="mono">{order.createdAt ? formatDateIL(order.createdAt) : "—"}</p>
              </div>
            </div>
            {order.notes && (
              <div className="order-detail-box">
                <label>הערות</label>
                <p>{order.notes}</p>
              </div>
            )}
          </div>

          <div className="order-details-section">
            <div className="order-details-section-title-row">
              <h3>שיוך שיער בפועל</h3>
              <button
                type="button"
                className="btn-accent"
                onClick={() => onOpenAssignHair(order.id)}
              >
                🧶 ניהול שיוך שיער
              </button>
            </div>
            {usedHairItems.length === 0 ? (
              <p className="order-details-empty">עדיין לא שויך קוקו בפועל להזמנה זו.</p>
            ) : (
              <div className="order-details-list">
                {usedHairItems.map((used, idx) => (
                  <div key={idx} className="order-details-row">
                    <span>{used.hairItemLabel} · {used.gramsUsed} גרם</span>
                    <span className="mono font-bold">₪{used.costAtTime.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="order-details-section">
            <h3>פריטי מלאי שנוצלו</h3>
            {usedBulkItems.length === 0 ? (
              <p className="order-details-empty">לא נוצלו פריטי מלאי פשוט בהזמנה זו.</p>
            ) : (
              <div className="order-details-list">
                {usedBulkItems.map((used, idx) => (
                  <div key={idx} className="order-details-row">
                    <span>{used.itemName} × {used.quantity}</span>
                    <span className="mono font-bold">₪{(used.unitCostAtTime * used.quantity).toFixed(0)}</span>
                    <button
                      type="button"
                      className="order-details-remove-btn"
                      onClick={() => handleRemoveBulkItem(idx)}
                      disabled={savingBulkItem}
                      aria-label="הסרת פריט"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="order-details-add-section">
              <label className="order-details-add-label">הוספת פריט מהמלאי</label>
              <div className="order-details-add-row">
                <select value={bulkItemPickerId} onChange={(e) => setBulkItemPickerId(e.target.value)}>
                  <option value="">בחרי פריט מהמלאי...</option>
                  {bulkItemsCatalog.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} (במלאי: {b.quantity})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={bulkItemPickerQty}
                  onChange={(e) => setBulkItemPickerQty(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddBulkItem}
                  disabled={savingBulkItem || !selectedBulkCatalogItem || bulkItemPickerQty === "" || bulkQtyExceedsStock}
                >
                  {savingBulkItem ? "מוסיפה..." : "+ הוסף פריט"}
                </button>
              </div>
              {bulkQtyExceedsStock && (
                <div className="order-details-error">הכמות עולה על המלאי הזמין ({selectedBulkCatalogItem?.quantity}).</div>
              )}
              {bulkItemError && <div className="order-details-error">{bulkItemError}</div>}
            </div>
          </div>

          <div className="order-details-section">
            <h3>תשלומים</h3>
            <div className="order-details-grid order-details-grid-3">
              <div className="order-detail-box">
                <label>סה"כ מחיר</label>
                <p className="mono font-bold">₪{(order.totalPrice || 0).toLocaleString()}</p>
              </div>
              <div className="order-detail-box">
                <label>שולם בפועל</label>
                <p className="mono font-bold text-success">₪{(order.paidAmount || 0).toLocaleString()}</p>
              </div>
              <div className="order-detail-box">
                <label>יתרת חוב</label>
                <p className="mono font-bold text-danger">₪{debt.toLocaleString()}</p>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="order-details-list">
                {payments.map((p, idx) =>
                  editingPaymentIndex === idx ? (
                    <div key={idx} className="order-details-row order-details-row--editing">
                      <div className="add-payment-row">
                        <input
                          type="number"
                          placeholder="סכום (₪)"
                          min={0}
                          value={editPayAmount}
                          onChange={(e) => setEditPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                        <select value={editPayMethod} onChange={(e) => setEditPayMethod(e.target.value as OrderPayment["method"])}>
                          <option value="cash">💵 מזומן</option>
                          <option value="credit">💳 אשראי</option>
                          <option value="transfer">🏦 העברה</option>
                          <option value="check">📜 צ'ק</option>
                        </select>
                        <DateInput value={editPayDate} onChange={setEditPayDate} />
                      </div>
                      <input
                        type="text"
                        className="add-payment-note"
                        placeholder="הערה (אופציונלי)"
                        value={editPayNote}
                        onChange={(e) => setEditPayNote(e.target.value)}
                      />
                      {editPaymentError && <div className="order-details-error">{editPaymentError}</div>}
                      <div className="order-details-edit-actions">
                        <button type="button" className="btn-secondary" onClick={handleCancelEditPayment} disabled={savingEditPayment}>
                          ביטול
                        </button>
                        <button type="button" className="btn-primary" onClick={() => handleSaveEditPayment(idx)} disabled={savingEditPayment}>
                          {savingEditPayment ? "שומרת..." : "שמירה"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="order-details-row">
                      <span>{PAYMENT_METHOD_LABELS[p.method]} · <span className="mono">{formatDateIL(p.date)}</span>{p.note ? ` · ${p.note}` : ""}</span>
                      <span className="mono font-bold">₪{p.amount.toLocaleString()}</span>
                      <button
                        type="button"
                        className="order-details-edit-btn"
                        onClick={() => handleStartEditPayment(idx)}
                        aria-label="עריכת תשלום"
                        title="עריכת תשלום"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="order-details-remove-btn"
                        onClick={() => setDeletingPaymentIndex(idx)}
                        aria-label="מחיקת תשלום"
                        title="מחיקת תשלום"
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="add-payment-form">
              <label className="add-payment-title">הוספת תשלום</label>
              <div className="add-payment-row">
                <input
                  type="number"
                  placeholder="סכום (₪)"
                  min={0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as OrderPayment["method"])}>
                  <option value="cash">💵 מזומן</option>
                  <option value="credit">💳 אשראי</option>
                  <option value="transfer">🏦 העברה</option>
                  <option value="check">📜 צ'ק</option>
                </select>
                <DateInput value={payDate} onChange={setPayDate} />
              </div>
              <input
                type="text"
                className="add-payment-note"
                placeholder="הערה (אופציונלי)"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
              {paymentError && <div className="order-details-error">{paymentError}</div>}
              <button type="button" className="btn-primary" onClick={handleAddPayment} disabled={savingPayment}>
                {savingPayment ? "מוסיפה..." : "+ הוספת תשלום"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deletingPaymentIndex !== null}
        title="מחיקת תשלום"
        message="למחוק את התשלום הזה? הפעולה תעדכן את הסכום ששולם בפועל, ולא ניתנת לביטול."
        variant="danger"
        confirmLabel={deletingPayment ? "מוחקת..." : "כן, מחיקה"}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => setDeletingPaymentIndex(null)}
      />
    </>
  );
}
