import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { UsedBulkItem, UsedHairItem, OrderPayment } from "../../types";
import { isUnsoldShowroomStock, type ShowroomBuildStatus, type ShowroomSpecs } from "../../utils/orderCreation";
import AssignHairModal from "../../components/orders/AssignHairModal";
import OrderDetailsPanel from "../../components/orders/OrderDetailsPanel";
import { calculateOrderProfit } from "../../utils/orderProfit";
import DateInput from "../../components/common/DateInput";
import CustomSelect from "../../components/common/CustomSelect";
import "./Sales.css";

// ערך-סמן לבחירת "אחר / הוסף חדש" בסטטוס ההזמנה - אותו דפוס בדיוק כמו
// OTHER_APPOINTMENT_TYPE ב-Calendar.tsx. לא נשמר בפועל כ-status - רק פותח
// שדה טקסט חופשי (ראו editingCustomStatusValue).
const OTHER_STATUS = "__other__";
const KNOWN_STATUSES = ["new", "in_progress", "styling", "ready", "delivered"];
const STATUS_SELECT_OPTIONS = [
  { value: "new", label: "חדשה 🆕" },
  { value: "in_progress", label: "בטיפול ⏳" },
  { value: "styling", label: "בסירוק 💇‍♀️" },
  { value: "ready", label: "מוכנה לאיסוף 🎁" },
  { value: "delivered", label: "נמסרה ✅" },
  { value: OTHER_STATUS, label: "אחר / הוסף חדש" },
];

export interface Order {
  id: string;
  clientId?: string | null; // null/חסר = עדיין בלי לקוחה (רלוונטי רק לפאת תצוגה, ראו isShowroomStock)
  clientName: string;
  clientPhone: string;
  orderType: string;
  // string ולא union סגור - כדי לאפשר סטטוס טקסט-חופשי ("אחר / הוסף חדש"),
  // אותו דפוס בדיוק כמו Appointment.type ב-Calendar.tsx. הערכים הידועים
  // עדיין ב-KNOWN_STATUSES/STATUS_SELECT_OPTIONS למטה.
  status: string;
  totalPrice: number;
  paidAmount: number;
  payments?: OrderPayment[];
  createdAt: string; // YYYY-MM-DD
  notes?: string;
  usedBulkItems?: UsedBulkItem[];
  usedHairItems?: UsedHairItem[];
  hairCostEstimated?: number;
  // --- פאת תצוגה (Inventory.tsx) - ראו ShowroomStockFormModal/SellShowroomStockModal ---
  isShowroomStock?: boolean; // true = מסמך פאת תצוגה שנוצר מראש במלאי; מוצג כאן רק אחרי מכירה (clientId מוגדר)
  retailPrice?: number; // מחיר מכירה מבוקש (לפני מכירה בפועל)
  showroomSpecs?: ShowroomSpecs;
  showroomCode?: string; // מזהה ידידותי (SHOWROOM-1001 וכו')
  showroomStatus?: ShowroomBuildStatus; // סטטוס תהליך הבנייה - נפרד מ-status הרגיל, ראו orderCreation.ts
}

export default function Sales() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // עריכת סטטוס טקסט-חופשי ("אחר / הוסף חדש") - שורה אחת בכל רגע נתון,
  // אותו דפוס בדיוק כמו עריכת סכום הוצאה ב-Expenses.tsx (editingAmountId).
  const [editingCustomStatusId, setEditingCustomStatusId] = useState<string | null>(null);
  const [editingCustomStatusValue, setEditingCustomStatusValue] = useState("");

  // סינון לפי תאריכים
  const [timeRange, setTimeRange] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // האזנה חיה ל-Firestore, מסוננת רק להזמנות של העסק המחובר (businessId = uid)
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const ordersQuery = query(collection(db, "orders"), where("businessId", "==", businessId));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, "id">),
          }))
          .filter((order) => !isUnsoldShowroomStock(order));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading orders:", err);
        setLoadError("שגיאה בטעינת ההזמנות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // עדכון סטטוס - נכתב ישירות ל-Firestore, onSnapshot למעלה יעדכן את המסך אוטומטית
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (err) {
      console.error("Error updating order status:", err);
      alert("שגיאה בעדכון הסטטוס. נסי שוב.");
    }
  };

  // שמירת סטטוס טקסט-חופשי שהוזן - אם נשאר ריק (למשל נבחר "אחר" בטעות
  // ולא הוקלד כלום), פשוט סוגרים את מצב העריכה בלי לשנות כלום.
  const commitCustomStatus = (orderId: string) => {
    const text = editingCustomStatusValue.trim();
    if (text) {
      handleStatusChange(orderId, text);
    }
    setEditingCustomStatusId(null);
  };

  // סינון דינמי
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.clientName?.includes(search) ||
      ord.id?.includes(search) ||
      ord.clientPhone?.includes(search);

    const matchesStatus = statusFilter === "all" || ord.status === statusFilter;

    let matchesTime = true;
    const orderDate = new Date(ord.createdAt);
    const today = new Date("2026-08-16");

    if (timeRange === "today") {
      matchesTime = ord.createdAt === today.toISOString().split("T")[0];
    } else if (timeRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      matchesTime = orderDate >= weekAgo && orderDate <= today;
    } else if (timeRange === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      matchesTime = orderDate >= monthAgo && orderDate <= today;
    } else if (timeRange === "custom") {
      if (startDate && orderDate < new Date(startDate)) matchesTime = false;
      if (endDate && orderDate > new Date(endDate)) matchesTime = false;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  const totalRevenue = filteredOrders.reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, ord) => sum + (ord.paidAmount || 0), 0);
  const openDebt = totalRevenue - totalPaid;
  const totalProfit = filteredOrders.reduce((sum, ord) => sum + calculateOrderProfit(ord), 0);
  const assigningOrder = orders.find((ord) => ord.id === assigningOrderId) || null;
  const selectedOrder = orders.find((ord) => ord.id === selectedOrderId) || null;

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>ניהול מכירות והזמנות</h1>
          <p className="subtitle">מעקב הזמנות, סטטוס ביצוע במתפרה וגביית תשלומים</p>
        </div>
      </div>

      <div className="financial-cards-grid">
        <div className="fin-card">
          <span className="fin-title">סה"כ מחזור הזמנות</span>
          <span className="fin-value mono">₪{totalRevenue.toLocaleString()}</span>
        </div>
        <div className="fin-card text-success">
          <span className="fin-title">שולם בפועל</span>
          <span className="fin-value mono">₪{totalPaid.toLocaleString()}</span>
        </div>
        <div className="fin-card text-danger">
          <span className="fin-title">יתרת חובות פתוחים</span>
          <span className="fin-value mono">₪{openDebt.toLocaleString()}</span>
        </div>
        <div className="fin-card text-profit">
          <span className="fin-title">רווח בפועל (משוער)</span>
          <span className="fin-value mono">₪{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div className="sales-toolbar-container">
        <div className="time-filters-bar">
          <span className="filter-label">📅 סינון לפי זמן:</span>
          <div className="time-buttons-group">
            <button className={`time-btn ${timeRange === "all" ? "active" : ""}`} onClick={() => setTimeRange("all")}>כל הזמן</button>
            <button className={`time-btn ${timeRange === "today" ? "active" : ""}`} onClick={() => setTimeRange("today")}>היום</button>
            <button className={`time-btn ${timeRange === "week" ? "active" : ""}`} onClick={() => setTimeRange("week")}>השבוע</button>
            <button className={`time-btn ${timeRange === "month" ? "active" : ""}`} onClick={() => setTimeRange("month")}>החודש</button>
            <button className={`time-btn ${timeRange === "custom" ? "active" : ""}`} onClick={() => setTimeRange("custom")}>לפי תאריכים</button>
          </div>

          {timeRange === "custom" && (
            <div className="custom-date-picker">
              <label>מתאריך: <DateInput value={startDate} onChange={setStartDate} /></label>
              <label>עד תאריך: <DateInput value={endDate} onChange={setEndDate} /></label>
            </div>
          )}
        </div>

        <div className="sales-toolbar">
          <input
            type="text"
            className="sales-search"
            placeholder="חיפוש לפי שם לקוחה, טלפון או מס' הזמנה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="status-filters">
            <button className={`filter-btn ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>הכל ({filteredOrders.length})</button>
            <button className={`filter-btn ${statusFilter === "new" ? "active" : ""}`} onClick={() => setStatusFilter("new")}>חדשה</button>
            <button className={`filter-btn ${statusFilter === "in_progress" ? "active" : ""}`} onClick={() => setStatusFilter("in_progress")}>בטיפול</button>
            <button className={`filter-btn ${statusFilter === "styling" ? "active" : ""}`} onClick={() => setStatusFilter("styling")}>בסירוק</button>
            <button className={`filter-btn ${statusFilter === "ready" ? "active" : ""}`} onClick={() => setStatusFilter("ready")}>מוכנה</button>
            <button className={`filter-btn ${statusFilter === "delivered" ? "active" : ""}`} onClick={() => setStatusFilter("delivered")}>נמסרה</button>
          </div>
        </div>
      </div>

      <div className="sales-table-wrapper">
        {loading ? (
          <div className="sales-state">
            <div className="sales-state__spinner" />
            <p>טוענת הזמנות...</p>
          </div>
        ) : loadError ? (
          <div className="sales-state sales-state--error">
            <span className="sales-state__icon">⚠️</span>
            <p>{loadError}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="sales-state">
            <p>לא נמצאו הזמנות תואמות לסינון הנבחר.</p>
          </div>
        ) : (
          <table className="sales-table">
            <thead>
              <tr>
                <th className="cell-client">שם הלקוחה</th>
                <th className="cell-type">סוג עבודה</th>
                <th className="cell-status">סטטוס ביצוע</th>
                <th className="cell-price">מחיר כולל</th>
                <th className="cell-profit">רווח</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                const profit = calculateOrderProfit(ord);
                // "משוער" רק כשיש בכלל רכיב שיער תלוי-הערכה (hairCostEstimated > 0)
                // ועדיין לא שויך קוקו בפועל - לא בכל הזמנה בלי usedHairItems (מוצר
                // קמעונאי/פאת תצוגה נשלחים עם hairCostEstimated: 0, העלות שלהם מדויקת מהרגע הראשון).
                const isEstimatedProfit =
                  (ord.hairCostEstimated ?? 0) > 0 && (!ord.usedHairItems || ord.usedHairItems.length === 0);
                const isCustomStatus = !KNOWN_STATUSES.includes(ord.status);
                const statusSelectValue = isCustomStatus ? OTHER_STATUS : ord.status;
                return (
                  <tr key={ord.id} className="sales-row" onClick={() => setSelectedOrderId(ord.id)}>
                    <td className="cell-client font-bold">{ord.clientName}</td>
                    <td className="cell-type">{ord.orderType || "פאה חדשה"}</td>
                    <td className="cell-status" onClick={(e) => e.stopPropagation()}>
                      <CustomSelect
                        className={`order-status-trigger order-status-trigger--${isCustomStatus ? "custom" : ord.status}`}
                        value={statusSelectValue}
                        onChange={(value) => {
                          if (value === OTHER_STATUS) {
                            setEditingCustomStatusId(ord.id);
                            setEditingCustomStatusValue(isCustomStatus ? ord.status : "");
                          } else {
                            setEditingCustomStatusId(null);
                            handleStatusChange(ord.id, value);
                          }
                        }}
                        options={STATUS_SELECT_OPTIONS}
                      />
                      {editingCustomStatusId === ord.id ? (
                        <input
                          type="text"
                          className="status-custom-input"
                          autoFocus
                          placeholder="הקלידי סטטוס..."
                          value={editingCustomStatusValue}
                          onChange={(e) => setEditingCustomStatusValue(e.target.value)}
                          onBlur={() => commitCustomStatus(ord.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitCustomStatus(ord.id);
                          }}
                        />
                      ) : (
                        isCustomStatus && (
                          <span
                            className="status-custom-label"
                            title="לחצי לעריכת הסטטוס"
                            onClick={() => {
                              setEditingCustomStatusId(ord.id);
                              setEditingCustomStatusValue(ord.status);
                            }}
                          >
                            {ord.status}
                          </span>
                        )
                      )}
                    </td>
                    <td className="cell-price mono font-bold">₪{(ord.totalPrice || 0).toLocaleString()}</td>
                    <td className="cell-profit mono text-profit">
                      ₪{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {isEstimatedProfit && <span className="profit-estimated-badge">משוער</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
}
