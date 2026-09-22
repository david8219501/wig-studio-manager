import { useState, useEffect } from "react";
import { addDoc, arrayUnion, collection, deleteDoc, doc, increment, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { Client } from "../../pages/Clients/Clients";
import type { Order } from "../../pages/Sales/Sales";
import type { CreditHistoryEntry } from "../../types";
import { isActiveOrder } from "../../utils/orderProfit";
import { formatDateIL } from "../../utils/formatDate";
import { REFUND_EXPENSE_CATEGORY } from "../../utils/businessSettings";
import NewOrderWizard, { type ClientOption } from "../orders/NewOrderWizard";
import RepairOrderForm from "../orders/RepairOrderForm";
import SellShowroomStockModal from "../../pages/Inventory/SellShowroomStockModal";
import OrderDetailsPanel from "../orders/OrderDetailsPanel";
import AssignHairModal from "../orders/AssignHairModal";
import ConfirmDialog from "../common/ConfirmDialog";
import CopyButton from "../common/CopyButton";
import "./ClientDrawer.css";

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  new: "חדשה",
  in_progress: "בטיפול",
  styling: "בסירוק",
  ready: "מוכנה",
  delivered: "נמסרה",
};

interface ClientDrawerProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient?: (updatedClient: Client) => void;
}

export default function ClientDrawer({ client, isOpen, onClose, onUpdateClient }: ClientDrawerProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "specs" | "docs">("orders");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [repairFormClient, setRepairFormClient] = useState<ClientOption | null>(null);
  const [sellingShowroomOrder, setSellingShowroomOrder] = useState<Order | null>(null);
  // ניהול תשלומים אמיתי בלשונית "תשלומים וחובות" - אותם רכיבים בדיוק כמו
  // ב-Sales.tsx (לא נבנה ניהול תשלומים נפרד): לחיצה על הזמנה פותחת
  // OrderDetailsPanel, שמאפשר משם גם לפתוח AssignHairModal.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  // State עבור מצב עריכת מידות ומפרט
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [measurements, setMeasurements] = useState("");
  const [notes, setNotes] = useState("");
  const [savingSpecs, setSavingSpecs] = useState(false);

  // הזמנות אמיתיות של הלקוחה, נטענות בזמן אמת מ-Firestore
  const [clientOrders, setClientOrders] = useState<Order[]>([]);

  // יתרת זכות - מאזין חי משלה על מסמך הלקוחה עצמו (לא רק ה-client prop
  // שמגיע מ-Clients.tsx וממשיך להיות "קפוא" מרגע הפתיחה - selectedClient
  // שם לא מתעדכן חי מה-onSnapshot של רשימת הלקוחות). קריטי כאן כי היתרה
  // יכולה להשתנות ממקום אחר לגמרי (ביטול הזמנה ב-OrderDetailsPanel,
  // ניצול ביתרה באשף הזמנה חדשה) בזמן שהמגירה הזו כבר פתוחה.
  const [isRefundFormOpen, setIsRefundFormOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [savingRefund, setSavingRefund] = useState(false);
  const [liveCreditBalance, setLiveCreditBalance] = useState(0);
  const [liveCreditHistory, setLiveCreditHistory] = useState<CreditHistoryEntry[]>([]);

  // ביטול רשומת שימוש בפועל ביתרת זכות (amount שלילי) - ראו
  // handleConfirmUndoCreditEntry. שומרת את האובייקט עצמו (לא אינדקס) כי
  // התצוגה מציגה את liveCreditHistory הפוך (חדש-ראשון) - אינדקס בתצוגה
  // לא תואם לאינדקס במערך המקורי, וגם לא נחוץ: הרשומה המקורית לא נמחקת
  // ולא מזוהה מחדש - רק קוראים ממנה relatedPaymentId/relatedExpenseId/amount.
  const [undoingCreditEntry, setUndoingCreditEntry] = useState<CreditHistoryEntry | null>(null);
  const [undoingCreditError, setUndoingCreditError] = useState<string | null>(null);
  const [undoingCreditSaving, setUndoingCreditSaving] = useState(false);

  useEffect(() => {
    // אין צורך לאפס state כשclient חסר - הרכיב כבר לא מרנדר כלום במקרה
    // הזה (return null אחרי ה-effects, ראו למטה), אז אין state "תקוע"
    // גלוי. setLiveCreditBalance/setLiveCreditHistory קוראות רק מתוך
    // ה-callback האסינכרוני של onSnapshot, לא סינכרונית בגוף ה-effect.
    if (!client) return;
    const unsubscribe = onSnapshot(
      doc(db, "clients", client.id),
      (snap) => {
        const data = snap.data() as { creditBalance?: number; creditHistory?: CreditHistoryEntry[] } | undefined;
        setLiveCreditBalance(data?.creditBalance ?? 0);
        setLiveCreditHistory(data?.creditHistory ?? []);
      },
      (err) => console.error("Error loading client credit balance:", err)
    );
    return () => unsubscribe();
  }, [client]);

  // סנכרון הנתונים בטעינת הלקוחה
  useEffect(() => {
    if (client) {
      setMeasurements(client.measurements || "");
      setNotes(client.notes || "");
      setIsEditingSpecs(false);
    }
  }, [client]);

  // האזנה חיה להזמנות של הלקוחה הנוכחית בלבד
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!client || !businessId) {
      setClientOrders([]);
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      where("businessId", "==", businessId),
      where("clientId", "==", client.id)
    );
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Order, "id">),
        }));
        data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setClientOrders(data);
      },
      (err) => console.error("Error loading client orders:", err)
    );

    return () => unsubscribe();
  }, [client]);

  if (!isOpen || !client) return null;

  // כרטיסי הסיכום בטאב "תשלומים וחובות" מחריגים הזמנות מבוטלות - "הזמנה
  // מבוטלת לא קיימת בשום חישוב". שתי הטבלאות הגולמיות (היסטוריית הזמנות/
  // פירוט לפי הזמנה, שתיהן נגזרות מ-clientOrders עצמו) ממשיכות להציג הכל.
  const activeClientOrders = clientOrders.filter(isActiveOrder);
  const totalPrice = activeClientOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalPaid = activeClientOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // נגזרים חי מ-clientOrders (לא state של האובייקט עצמו) - כדי שהפאנל/המודל
  // תמיד יראו עדכון מיידי (למשל אחרי הוספת תשלום), אותו דפוס כמו ב-Sales.tsx.
  const selectedOrder = clientOrders.find((o) => o.id === selectedOrderId) || null;
  const assigningOrder = clientOrders.find((o) => o.id === assigningOrderId) || null;

  const handleSaveSpecs = async () => {
    setSavingSpecs(true);
    try {
      await updateDoc(doc(db, "clients", client.id), { measurements, notes });
      setIsEditingSpecs(false);
      if (onUpdateClient) {
        onUpdateClient({ ...client, measurements, notes });
      }
    } catch (err) {
      console.error("Error saving client specs:", err);
      alert("שגיאה בשמירת המפרט. נסי שוב.");
    } finally {
      setSavingSpecs(false);
    }
  };

  // ביצוע החזר בפועל ללקוחה - מפחית מהיתרה ומוסיף רשומה שלילית ליומן,
  // אותו updateDoc אטומי (increment+arrayUnion) כמו הוספת יתרה ב-
  // handleCancelOrder (OrderDetailsPanel.tsx). בנוסף - כסף אמיתי שיוצא
  // מהעסק, אז נרשמת גם הוצאה (expenses) תחת קטגוריה נפרדת
  // ("החזרים ללקוחות", לא "מלאי ושיער") - כדי שהיא תיכלל בהוצאות
  // התפעול/שיווק (isInventoryExpenseCategory) ותשפיע נכון על "רווח
  // החודש" בדשבורד, ולא תתבלבל עם עלות ייצור/רכישת מלאי.
  const handleConfirmRefund = async () => {
    const amount = Number(refundAmount);
    if (refundAmount === "" || amount <= 0) {
      setRefundError("יש להזין סכום תקין.");
      return;
    }
    if (amount > liveCreditBalance) {
      setRefundError(`הסכום גבוה מהיתרה הקיימת (₪${liveCreditBalance.toLocaleString()}).`);
      return;
    }

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSavingRefund(true);
    setRefundError(null);
    try {
      const nowIso = new Date().toISOString();

      // נוצרת קודם (לא אחרי) - כדי שה-id שלה יהיה זמין ל-relatedExpenseId
      // ברשומת creditHistory, ו"ביטול" (עוד מהיום) יוכל למחוק בדיוק אותה.
      const expenseRef = await addDoc(collection(db, "expenses"), {
        businessId,
        date: nowIso.split("T")[0],
        supplier: client.name,
        category: REFUND_EXPENSE_CATEGORY,
        description: `החזר ללקוחה - ${client.name}`,
        amount,
        paymentMethod: "cash",
        status: "paid",
      });

      const creditEntry: CreditHistoryEntry = {
        amount: -amount,
        reason: "החזר ללקוחה",
        relatedExpenseId: expenseRef.id,
        date: nowIso,
      };
      await updateDoc(doc(db, "clients", client.id), {
        creditBalance: increment(-amount),
        creditHistory: arrayUnion(creditEntry),
      });

      // מוסיפה את הקטגוריה לרשימה המנוהלת בהגדרות אם היא עדיין לא שם -
      // arrayUnion אידמפוטנטי (לא כופל אם כבר קיימת), setDoc(merge:true)
      // כדי שזה יעבוד גם אם businessSettings/{uid} עדיין לא קיים בכלל.
      await setDoc(
        doc(db, "businessSettings", businessId),
        { expenseCategories: arrayUnion(REFUND_EXPENSE_CATEGORY) },
        { merge: true }
      );

      setIsRefundFormOpen(false);
      setRefundAmount("");
    } catch (err) {
      console.error("Error refunding credit balance to client:", err);
      setRefundError("שגיאה בביצוע ההחזר. נסי שוב.");
    } finally {
      setSavingRefund(false);
    }
  };

  // ביטול רשומת שימוש ביתרת זכות (amount שלילי) - הופך את הפעולה
  // המקורית, אבל **לא מוחק אותה** מההיסטוריה (נשארת כתיעוד, בדיוק כמו
  // wasteReconciliationLog/ביטול סגירת קוקו) - רק מוסיף רשומה חדשה
  // חיובית + מבצע את ההפיכה בפועל (מחיקת ה-expense המתאים / הסרת
  // התשלום המתאים מההזמנה המקושרת). relatedExpenseId מזהה "החזר
  // ללקוחה"; relatedPaymentId מזהה "ניצול/תשלום מיתרת זכות" - שני
  // המקרים סותרים זה את זה (לא אמורה להיות רשומה עם שניהם).
  const handleConfirmUndoCreditEntry = async () => {
    if (!undoingCreditEntry) return;
    const amountToRestore = Math.abs(undoingCreditEntry.amount);

    setUndoingCreditSaving(true);
    setUndoingCreditError(null);
    try {
      if (undoingCreditEntry.relatedExpenseId) {
        // deleteDoc על מסמך שכבר לא קיים מצליח בשקט (לא זורק) - אין צורך
        // בבדיקת קיום מפורשת לפני כן, כמבוקש ("אם עדיין קיים... אם נמחק
        // כבר ידנית, מדלג בשקט").
        await deleteDoc(doc(db, "expenses", undoingCreditEntry.relatedExpenseId));
      } else if (undoingCreditEntry.relatedPaymentId && undoingCreditEntry.relatedOrderId) {
        const relatedOrder = clientOrders.find((o) => o.id === undoingCreditEntry.relatedOrderId);
        const existingPayment = relatedOrder?.payments?.find((p) => p.id === undoingCreditEntry.relatedPaymentId);
        if (relatedOrder && existingPayment) {
          const newPayments = (relatedOrder.payments ?? []).filter((p) => p.id !== undoingCreditEntry.relatedPaymentId);
          const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
          await updateDoc(doc(db, "orders", relatedOrder.id), {
            payments: newPayments,
            paidAmount: newPaidAmount,
          });
        }
        // אם ההזמנה או התשלום הספציפי לא נמצאו - מדלגים בשקט על השלב
        // הזה, וממשיכים רק עם הזיכוי ליתרה (כמבוקש במפורש).
      }

      // Firestore דוחה ערך undefined במפורש (גם בתוך אובייקט מקונן
      // בתוך מערך, לא רק שדה top-level) - relatedOrderId לא קיים כלל
      // ברשומת "החזר ללקוחה" (relatedExpenseId), אז נכלל רק אם יש בפועל.
      const reason =
        undoingCreditEntry.relatedExpenseId ? "ביטול החזר ללקוחה" : "ביטול ניצול יתרת זכות";
      const creditEntry: CreditHistoryEntry = {
        amount: amountToRestore,
        reason,
        date: new Date().toISOString(),
        ...(undoingCreditEntry.relatedOrderId ? { relatedOrderId: undoingCreditEntry.relatedOrderId } : {}),
      };
      await updateDoc(doc(db, "clients", client.id), {
        creditBalance: increment(amountToRestore),
        creditHistory: arrayUnion(creditEntry),
      });

      setUndoingCreditEntry(null);
    } catch (err) {
      console.error("Error undoing credit history entry:", err);
      setUndoingCreditError("שגיאה בביטול הפעולה. נסי שוב.");
    } finally {
      setUndoingCreditSaving(false);
    }
  };

  const handleSendWhatsApp = () => {
    const message = `היי ${client.name} היקרה 🌸\nשמחים להיות בקשר מ-Esti Wigs!`;
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <>
      {/* Overlay Background */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Slide-over Panel */}
      <div className="client-drawer">
        {/* Header */}
        <div className="drawer-header">
          {/* צד ימין: אוואטר + פרטי הלקוחה */}
          <div className="drawer-header-right">
            <div className="client-avatar">
              👩‍💼
            </div>
            <div className="client-details">
              <h2>{client.name}</h2>
              <p className="mono drawer-contact-row" dir="ltr">
                <span className="drawer-contact-item">
                  {client.phone}
                  <CopyButton text={client.phone} title="העתקת טלפון" />
                </span>
                {client.email && (
                  <span className="drawer-contact-item">
                    •{" "}
                    <a
                      href={`mailto:${client.email}`}
                      className="drawer-email-link"
                      title={`שלחי מייל ל-${client.email}`}
                    >
                      {client.email}
                    </a>
                    <CopyButton text={client.email} title="העתקת אימייל" />
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* צד שמאל: כפתורי פעולה + כפתור סגירה X */}
          <div className="drawer-header-left">
            <div className="drawer-actions-bar">
              <button className="btn-primary" onClick={() => setIsWizardOpen(true)}>
                + הזמנה חדשה
              </button>
              <button className="btn-whatsapp" onClick={handleSendWhatsApp}>
                <svg className="whatsapp-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="currentColor">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
                וואטסאפ
              </button>
            </div>
            <button className="btn-close" onClick={onClose} title="סגירה" aria-label="סגירה">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="drawer-tabs">
          <button
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            📋 הזמנות ועבודות
          </button>
          <button
            className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            💳 תשלומים וחובות
          </button>
          <button
            className={`tab-btn ${activeTab === "specs" ? "active" : ""}`}
            onClick={() => setActiveTab("specs")}
          >
            📐 מידות ומפרט
          </button>
          <button
            className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            📄 מסמכים וחתימות
          </button>
        </div>

        {/* Tab Content */}
        <div className="drawer-body">
          {/* TAB 1: ORDERS */}
          {activeTab === "orders" && (
            <div className="tab-content">
              <h3>היסטוריית הזמנות ({clientOrders.length})</h3>
              {clientOrders.length === 0 ? (
                <p className="order-specs">עדיין אין הזמנות ללקוחה זו.</p>
              ) : (
                <div className="orders-list">
                  {clientOrders.map((ord) => (
                    <div key={ord.id} className="order-card">
                      <div className="order-card-header">
                        <span className="font-bold">{ord.orderType}</span>
                        <span className="badge badge-paid">{ORDER_STATUS_LABELS[ord.status] || ord.status}</span>
                      </div>
                      {ord.notes && <p className="order-specs">{ord.notes}</p>}
                      <div className="order-card-footer">
                        <span className="mono">תאריך: {formatDateIL(ord.createdAt)}</span>
                        <span className="mono font-bold">₪{ord.totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS - נתונים אמיתיים מ-clientOrders בלבד, בדיוק כמו בדף מכירות */}
          {activeTab === "payments" && (
            <div className="tab-content">
              <h3>סיכום מאזן ותשלומים</h3>
              <div className="financial-summary-grid">
                <div className="fin-card">
                  <span>סה"כ חויב</span>
                  <span className="mono font-bold">₪{totalPrice.toLocaleString()}</span>
                </div>
                <div className="fin-card">
                  <span>סה"כ שולם</span>
                  <span className="mono font-bold text-success">₪{totalPaid.toLocaleString()}</span>
                </div>
                <div className="fin-card">
                  <span>סה"כ חוב פתוח</span>
                  <span className="mono font-bold text-danger">
                    ₪{(totalPrice - totalPaid).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* יתרת זכות - לא מציגה כרטיס בכלל כשאין יתרה (0/undefined),
                  כדי לא להראות כרטיס ריק מיותר. היסטוריית creditHistory
                  ממשיכה להיות מוצגת גם כשהיתרה כבר התאפסה - מעקב מלא. */}
              {liveCreditBalance > 0 && (
                <div className="credit-balance-row">
                  <div className="fin-card text-success">
                    <span>יתרת זכות</span>
                    <span className="mono font-bold">₪{liveCreditBalance.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-refund-credit"
                    onClick={() => setIsRefundFormOpen((prev) => !prev)}
                  >
                    💸 ביצוע החזר ללקוחה
                  </button>
                </div>
              )}

              {isRefundFormOpen && (
                <div className="credit-refund-form">
                  <input
                    type="number"
                    min={0}
                    max={liveCreditBalance}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={`עד ₪${liveCreditBalance.toLocaleString()}`}
                  />
                  <button type="button" className="btn-primary" onClick={handleConfirmRefund} disabled={savingRefund}>
                    {savingRefund ? "מבצעת..." : "אישור החזר"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsRefundFormOpen(false);
                      setRefundAmount("");
                      setRefundError(null);
                    }}
                    disabled={savingRefund}
                  >
                    ביטול
                  </button>
                  {refundError && <span className="field-error">{refundError}</span>}
                </div>
              )}

              {liveCreditHistory.length > 0 && (
                <div className="credit-history-section">
                  <h3>היסטוריית יתרת זכות</h3>
                  <table className="credit-history-table" dir="rtl">
                    <thead>
                      <tr>
                        <th>תאריך</th>
                        <th>סכום</th>
                        <th>סיבה</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...liveCreditHistory].reverse().map((entry, i) => (
                        <tr key={i}>
                          <td className="mono">{formatDateIL(entry.date)}</td>
                          <td className={`mono ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>
                            {entry.amount >= 0 ? "+" : ""}₪{entry.amount.toLocaleString()}
                          </td>
                          <td>{entry.reason}</td>
                          <td>
                            {/* רק שימוש בפועל (amount שלילי) ניתן לביטול - לא
                                "ביטול הזמנה" (amount חיובי, שינוי גדול יותר,
                                לא בתחום הזה). */}
                            {entry.amount < 0 && (
                              <button
                                type="button"
                                className="credit-history-undo-btn"
                                onClick={() => setUndoingCreditEntry(entry)}
                                aria-label="ביטול פעולה"
                                title="ביטול פעולה"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="payments-orders-section">
                <h3>פירוט לפי הזמנה</h3>
                {clientOrders.length === 0 ? (
                  <p className="order-specs">עדיין אין הזמנות ללקוחה זו.</p>
                ) : (
                  <div className="payments-orders-table-wrapper">
                    <table className="payments-orders-table" dir="rtl">
                      <thead>
                        <tr>
                          <th>תאריך</th>
                          <th>סוג עבודה</th>
                          <th>מחיר כולל</th>
                          <th>שולם</th>
                          <th>חוב פתוח</th>
                          <th>סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientOrders.map((ord) => {
                          const debt = (ord.totalPrice || 0) - (ord.paidAmount || 0);
                          return (
                            <tr key={ord.id} onClick={() => setSelectedOrderId(ord.id)}>
                              <td className="mono">{formatDateIL(ord.createdAt)}</td>
                              <td>{ord.orderType}</td>
                              <td className="mono">₪{(ord.totalPrice || 0).toLocaleString()}</td>
                              <td className="mono text-success">₪{(ord.paidAmount || 0).toLocaleString()}</td>
                              <td className="mono text-danger">₪{debt.toLocaleString()}</td>
                              <td>
                                <span className={`order-status-badge status-${ord.status}`}>
                                  {ORDER_STATUS_LABELS[ord.status] || ord.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MEASUREMENTS & SPECS (עם אפשרות עריכה) */}
          {activeTab === "specs" && (
            <div className="tab-content">
              <div className="tab-title-row">
                <h3>מידות ראש ומפרט אישי</h3>
                {!isEditingSpecs ? (
                  <button className="btn-edit-specs" onClick={() => setIsEditingSpecs(true)}>
                    ✏️ עריכת מפרט
                  </button>
                ) : (
                  <button className="btn-save-specs" onClick={handleSaveSpecs} disabled={savingSpecs}>
                    {savingSpecs ? "שומר..." : "💾 שמירת שינויים"}
                  </button>
                )}
              </div>

              <div className="specs-grid">
                <div className="spec-box">
                  <label className="spec-label">מידות היקף / ראש:</label>
                  {!isEditingSpecs ? (
                    <p className="spec-value">{measurements || "לא הוזנו מידות עדיין."}</p>
                  ) : (
                    <textarea
                      className="spec-input"
                      value={measurements}
                      onChange={(e) => setMeasurements(e.target.value)}
                      placeholder='למשל: מידה M - היקף 54 ס"מ'
                      rows={3}
                    />
                  )}
                </div>

                <div className="spec-box">
                  <label className="spec-label">הערות ודגשים מיוחדים:</label>
                  {!isEditingSpecs ? (
                    <p className="spec-value">{notes || "אין הערות."}</p>
                  ) : (
                    <textarea
                      className="spec-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="למשל: מעדיפה לייס שקוף דק, רגישות קלה בעורף"
                      rows={4}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === "docs" && (
            <div className="tab-content">
              <h3>מסמכים, קבלות וטפסים חתומים</h3>
              <p className="order-specs">
                עדיין אין אפשרות להעלות מסמכים למערכת — הפיצ׳ר הזה יתווסף בהמשך.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Order Wizard */}
      <NewOrderWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onOrderCreated={() => {}}
        preselectedClient={{ id: client.id, name: client.name, phone: client.phone, creditBalance: liveCreditBalance }}
        onOpenRepairForm={(repairClient) => setRepairFormClient(repairClient)}
        onOpenSellShowroom={(order) => setSellingShowroomOrder(order)}
      />

      {/* טופס תיקונים/שירות נפרד ופשוט - נפתח מתוך בחירת "תיקון / שירות" באשף */}
      <RepairOrderForm
        isOpen={repairFormClient !== null}
        client={repairFormClient}
        onClose={() => setRepairFormClient(null)}
        onCreated={() => {}}
      />

      {/* מכירת פאת תצוגה קיימת - נפתח מתוך בחירת "פאת תצוגה" באשף, עם הלקוחה
          כבר ידועה מראש (מדלג על שלב בחירת לקוחה בתוך המודל עצמו) */}
      <SellShowroomStockModal
        isOpen={sellingShowroomOrder !== null}
        order={sellingShowroomOrder}
        preselectedClient={{ id: client.id, name: client.name, phone: client.phone }}
        onClose={() => setSellingShowroomOrder(null)}
        onSold={() => setSellingShowroomOrder(null)}
      />

      {/* פאנל פרטי הזמנה - אותו רכיב בדיוק כמו ב-Sales.tsx (לא שכפול), עם
          ניהול תשלומים מובנה. נפתח בלחיצה על שורת הזמנה בלשונית "תשלומים וחובות" */}
      <OrderDetailsPanel
        isOpen={selectedOrderId !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onOpenAssignHair={(orderId) => setAssigningOrderId(orderId)}
      />

      <AssignHairModal
        isOpen={assigningOrderId !== null}
        order={assigningOrder}
        onClose={() => setAssigningOrderId(null)}
      />

      <ConfirmDialog
        isOpen={undoingCreditEntry !== null}
        title="ביטול פעולה ביתרת זכות"
        message={
          undoingCreditEntry
            ? `${
                undoingCreditEntry.relatedExpenseId
                  ? `ביטול פעולה זו יחזיר ₪${Math.abs(undoingCreditEntry.amount).toLocaleString()} ליתרת הזכות, וימחק את הוצאת ה"החזר ללקוחה" המתאימה.`
                  : `ביטול פעולה זו יחזיר ₪${Math.abs(undoingCreditEntry.amount).toLocaleString()} ליתרת הזכות, ויסיר את התשלום המתאים מההזמנה המקושרת.`
              }${undoingCreditError ? `\n\n${undoingCreditError}` : ""}`
            : ""
        }
        variant="warning"
        confirmLabel={undoingCreditSaving ? "מבטלת..." : "כן, בטלי"}
        onConfirm={handleConfirmUndoCreditEntry}
        onCancel={() => {
          setUndoingCreditEntry(null);
          setUndoingCreditError(null);
        }}
      />
    </>
  );
}