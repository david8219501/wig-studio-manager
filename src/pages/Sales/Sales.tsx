import { useState } from "react";
import "./Sales.css";

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  orderType: string;
  status: "new" | "in_progress" | "styling" | "ready" | "delivered";
  totalPrice: number;
  paidAmount: number;
  createdAt: string; // YYYY-MM-DD
  notes?: string;
}

// נתוני דמו לוקאליים
const DEMO_ORDERS: Order[] = [
  {
    id: "ORD-901",
    clientName: "שרה לוי",
    clientPhone: "050-1234567",
    orderType: "פאה חדשה",
    status: "ready",
    totalPrice: 18000,
    paidAmount: 12000,
    createdAt: "2026-08-15",
    notes: 'מידה S | גלי | עבודת יד גבוהה | 55 ס"מ',
  },
  {
    id: "ORD-902",
    clientName: "מירי כהן",
    clientPhone: "052-9876543",
    orderType: "פאה חדשה",
    status: "in_progress",
    totalPrice: 14500,
    paidAmount: 14500,
    createdAt: "2026-08-12",
    notes: "דגש על נוחות בעורף, לייס שקוף",
  },
  {
    id: "ORD-402",
    clientName: "שרה לוי",
    clientPhone: "050-1234567",
    orderType: "תיקון וסירוק",
    status: "delivered",
    totalPrice: 450,
    paidAmount: 450,
    createdAt: "2026-08-01",
    notes: "חפיפה, פן וחיזוק רשת",
  },
  {
    id: "ORD-903",
    clientName: "רחלי פרידמן",
    clientPhone: "054-1112233",
    orderType: "תוספת שיער וצבע",
    status: "styling",
    totalPrice: 2200,
    paidAmount: 1000,
    createdAt: "2026-07-20",
    notes: "מילוי 50 גרם שיער + גוונים",
  },
];

export default function Sales() {
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // סינון לפי תאריכים
  const [timeRange, setTimeRange] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // עדכון סטטוס לוקאלי
  const handleStatusChange = (orderId: string, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
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
              <label>מתאריך: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
              <label>עד תאריך: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
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
        {filteredOrders.length === 0 ? (
          <div className="sales-state">
            <p>לא נמצאו הזמנות תואמות לסינון הנבחר.</p>
          </div>
        ) : (
          <table className="sales-table">
            <thead>
              <tr>
                <th className="cell-id">מס' הזמנה</th>
                <th className="cell-client">שם הלקוחה</th>
                <th className="cell-type">סוג עבודה</th>
                <th className="cell-date">תאריך</th>
                <th className="cell-price">סה"כ מחיר</th>
                <th className="cell-paid">שולם</th>
                <th className="cell-debt">יתרה</th>
                <th className="cell-status">סטטוס ביצוע</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                const debt = (ord.totalPrice || 0) - (ord.paidAmount || 0);
                return (
                  <tr key={ord.id}>
                    <td className="cell-id mono font-bold">{ord.id}</td>
                    <td className="cell-client font-bold">{ord.clientName}</td>
                    <td className="cell-type">{ord.orderType || "פאה חדשה"}</td>
                    <td className="cell-date mono">{ord.createdAt || "—"}</td>
                    <td className="cell-price mono font-bold">₪{(ord.totalPrice || 0).toLocaleString()}</td>
                    <td className="cell-paid mono text-success">₪{(ord.paidAmount || 0).toLocaleString()}</td>
                    <td className="cell-debt mono text-danger">₪{debt.toLocaleString()}</td>
                    <td className="cell-status">
                      <select
                        className={`status-select status-${ord.status}`}
                        value={ord.status}
                        onChange={(e) =>
                          handleStatusChange(ord.id, e.target.value as Order["status"])
                        }
                      >
                        <option value="new">חדשה 🆕</option>
                        <option value="in_progress">בטיפול ⏳</option>
                        <option value="styling">בסירוק 💇‍♀️</option>
                        <option value="ready">מוכנה לאיסוף 🎁</option>
                        <option value="delivered">נמסרה ✅</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}