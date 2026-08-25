import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import "./Dashboard.css";

// ─── Types (תואמים למבנה האמיתי בקולקציות orders/clients/bulkItems) ────────

interface OrderDoc {
  id: string;
  clientName: string;
  orderType: string;
  status: "new" | "in_progress" | "styling" | "ready" | "delivered";
  totalPrice: number;
  paidAmount: number;
  createdAt: string; // YYYY-MM-DD
}

interface ClientDoc {
  id: string;
  createdAt: string;
}

interface BulkItemDoc {
  id: string;
  name: string;
  quantity: number;
  minThreshold: number;
}

const STATUS_LABELS: Record<OrderDoc["status"], string> = {
  new: "חדשה",
  in_progress: "בטיפול",
  styling: "בסירוק",
  ready: "מוכנה",
  delivered: "נמסרה",
};

const MONTH_NAMES_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יוני", "יולי", "אוג", "ספט", "אוק", "נוב", "דצמ"];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new": return <span className="dash-badge badge-new">חדשה 🆕</span>;
    case "in_progress": return <span className="dash-badge badge-progress">בטיפול ⏳</span>;
    case "styling": return <span className="dash-badge badge-styling">בסירוק 💇‍♀️</span>;
    case "ready": return <span className="dash-badge badge-ready">מוכנה 🎁</span>;
    case "delivered": return <span className="dash-badge badge-ready">נמסרה ✅</span>;
    default: return null;
  }
}

// פונקציה לקבלת ברכה דינמית לפי השעה ביום
function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `בוקר טוב, ${name} 👋`;
  if (hour >= 12 && hour < 17) return `צהריים טובים, ${name} 👋`;
  if (hour >= 17 && hour < 21) return `ערב טוב, ${name} 👋`;
  return `לילה טוב, ${name} 🌙`;
}

const SERVICE_COLORS = ["#9b69ff", "#32c589", "#f2994a", "#7094ee", "#e0679b"];

export default function Dashboard() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFirstName, setOwnerFirstName] = useState("");

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) {
      setLoading(false);
      return;
    }

    getDoc(doc(db, "users", businessId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as { firstName?: string };
          if (data.firstName) setOwnerFirstName(data.firstName);
        }
      })
      .catch((err) => console.error("Error loading owner profile for greeting:", err));

    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), where("businessId", "==", businessId)),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderDoc, "id">) })));
        setLoading(false);
      },
      (err) => { console.error("Error loading orders for dashboard:", err); setLoading(false); }
    );

    const unsubClients = onSnapshot(
      query(collection(db, "clients"), where("businessId", "==", businessId)),
      (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientDoc, "id">) })))
    );

    const unsubBulk = onSnapshot(
      query(collection(db, "bulkItems"), where("businessId", "==", businessId)),
      (snap) => setBulkItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BulkItemDoc, "id">) })))
    );

    return () => {
      unsubOrders();
      unsubClients();
      unsubBulk();
    };
  }, []);

  const currentDate = new Date().toLocaleDateString("he-IL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const monthRevenue = orders
      .filter((o) => o.createdAt?.startsWith(thisMonthKey))
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    const lastMonthRevenue = orders
      .filter((o) => o.createdAt?.startsWith(lastMonthKey))
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    const revenueTrend = lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    const openDebt = orders.reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.paidAmount || 0)), 0);

    const activeOrders = orders.filter((o) => o.status !== "delivered");
    const readyOrders = orders.filter((o) => o.status === "ready");

    const newClientsThisMonth = clients.filter((c) => c.createdAt?.startsWith(thisMonthKey)).length;
    const newClientsLastMonth = clients.filter((c) => c.createdAt?.startsWith(lastMonthKey)).length;

    return {
      monthRevenue, revenueTrend, openDebt,
      activeOrdersCount: activeOrders.length,
      readyOrdersCount: readyOrders.length,
      newClientsThisMonth, newClientsLastMonth,
    };
  }, [orders, clients, thisMonthKey, lastMonthKey]);

  // גרף הכנסות - 6 חודשים אחרונים, מחושב באמת מתוך ההזמנות
  const revenueData = useMemo(() => {
    const months: { key: string; month: string; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, month: MONTH_NAMES_HE[d.getMonth()], income: 0 });
    }
    orders.forEach((o) => {
      const match = months.find((m) => o.createdAt?.startsWith(m.key));
      if (match) match.income += o.totalPrice || 0;
    });
    return months;
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 4);
  }, [orders]);

  const servicesBreakdown = useMemo(() => {
    const byType = new Map<string, number>();
    orders.forEach((o) => {
      const type = o.orderType || "אחר";
      byType.set(type, (byType.get(type) || 0) + (o.totalPrice || 0));
    });
    const total = Array.from(byType.values()).reduce((a, b) => a + b, 0);
    return Array.from(byType.entries())
      .map(([name, amount], idx) => ({
        name,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: SERVICE_COLORS[idx % SERVICE_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orders]);

  const lowStockItems = bulkItems.filter((b) => b.quantity < b.minThreshold);
  const debtOrders = orders.filter((o) => (o.totalPrice || 0) - (o.paidAmount || 0) > 0);

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{getGreeting(ownerFirstName || "שלום")}</h1>
          <p className="dash-subtitle">{currentDate} | סקירה כללית של הסלון</p>
        </div>
      </div>

      {loading ? (
        <div className="dash-card">
          <p>טוענת נתוני לוח בקרה...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="dash-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon icon-purple">💰</div>
              <div className="kpi-content">
                <span className="kpi-label">הכנסות החודש</span>
                <span className="kpi-value">₪{stats.monthRevenue.toLocaleString()}</span>
                {stats.revenueTrend !== null ? (
                  <span className={`kpi-trend ${stats.revenueTrend >= 0 ? "trend-up" : "trend-down"}`}>
                    {stats.revenueTrend >= 0 ? "↑" : "↓"} {Math.abs(stats.revenueTrend)}% מחודש שעבר
                  </span>
                ) : (
                  <span className="kpi-trend trend-neutral">אין נתוני השוואה</span>
                )}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon icon-orange">💳</div>
              <div className="kpi-content">
                <span className="kpi-label">חובות פתוחים</span>
                <span className="kpi-value">₪{stats.openDebt.toLocaleString()}</span>
                <span className="kpi-trend trend-neutral">{debtOrders.length} הזמנות עם יתרה</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon icon-blue">💇‍♀️</div>
              <div className="kpi-content">
                <span className="kpi-label">הזמנות בעבודה</span>
                <span className="kpi-value">{stats.activeOrdersCount}</span>
                <span className="kpi-trend trend-neutral">{stats.readyOrdersCount} פאות מוכנות למסירה</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon icon-green">👥</div>
              <div className="kpi-content">
                <span className="kpi-label">לקוחות חדשות (החודש)</span>
                <span className="kpi-value">{stats.newClientsThisMonth}</span>
                <span className="kpi-trend trend-neutral">{stats.newClientsLastMonth} בחודש שעבר</span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="dash-main-grid">

            {/* Left Column */}
            <div className="dash-left-col">

              {/* Revenue Bar Chart */}
              <div className="dash-card">
                <h2 className="dash-card-title">📈 הכנסות חודשיות (₪)</h2>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6f7" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#63537a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#63537a' }} />
                      <Tooltip
                        cursor={{ fill: '#f8f3fa' }}
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, "הכנסה"]}
                      />
                      <Bar dataKey="income" name="הכנסה" radius={[6, 6, 0, 0]} barSize={40}>
                        {revenueData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? "#9b69ff" : "#d6bfed"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="dash-card">
                <h2 className="dash-card-title">📋 הזמנות פעילות אחרונות</h2>
                {recentOrders.length === 0 ? (
                  <p className="text-muted">עדיין אין הזמנות במערכת.</p>
                ) : (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>מס' הזמנה</th>
                        <th>לקוחה</th>
                        <th>סוג עבודה</th>
                        <th>סטטוס</th>
                        <th>מחיר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="mono font-bold text-muted">#{order.id.slice(-6)}</td>
                          <td className="font-bold">{order.clientName}</td>
                          <td>{order.orderType}</td>
                          <td><StatusBadge status={order.status} /></td>
                          <td className="mono font-bold">₪{(order.totalPrice || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="dash-right-col">

              {/* Smart Alerts */}
              <div className="dash-card">
                <h2 className="dash-card-title">🔔 מרכז התראות</h2>
                <div className="alerts-list">
                  {stats.readyOrdersCount === 0 && lowStockItems.length === 0 && debtOrders.length === 0 && (
                    <p className="text-muted">אין התראות פעילות כרגע 🎉</p>
                  )}

                  {orders.filter((o) => o.status === "ready").slice(0, 2).map((o) => (
                    <div key={o.id} className="alert-item alert-success">
                      <div className="alert-icon">🎁</div>
                      <div className="alert-text">
                        <strong>מוכנה לאיסוף:</strong> ההזמנה של {o.clientName} מוכנה למסירה.
                      </div>
                    </div>
                  ))}

                  {lowStockItems.slice(0, 2).map((item) => (
                    <div key={item.id} className="alert-item alert-warning">
                      <div className="alert-icon">⚠️</div>
                      <div className="alert-text">
                        <strong>מלאי נמוך:</strong> נותרו {item.quantity} יחידות בלבד מ"{item.name}".
                      </div>
                    </div>
                  ))}

                  {debtOrders.slice(0, 2).map((o) => (
                    <div key={o.id} className="alert-item alert-danger">
                      <div className="alert-icon">💰</div>
                      <div className="alert-text">
                        <strong>חוב פתוח:</strong> {o.clientName} טרם השלימה תשלום עבור ₪{((o.totalPrice || 0) - (o.paidAmount || 0)).toLocaleString()}.
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Breakdown */}
              <div className="dash-card">
                <h2 className="dash-card-title">📊 התפלגות סוגי עבודה</h2>
                {servicesBreakdown.length === 0 ? (
                  <p className="text-muted">אין עדיין נתוני הזמנות לפילוח.</p>
                ) : (
                  <div className="breakdown-list">
                    {servicesBreakdown.map((item, idx) => (
                      <div key={idx} className="breakdown-item">
                        <div className="breakdown-info">
                          <span className="breakdown-name font-bold">{item.name}</span>
                          <div className="breakdown-numbers">
                            <span className="breakdown-amount mono">₪{item.amount.toLocaleString()}</span>
                            <span className="breakdown-percent mono">({item.percent}%)</span>
                          </div>
                        </div>
                        <div className="breakdown-track">
                          <div
                            className="breakdown-fill"
                            style={{ width: `${item.percent}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
