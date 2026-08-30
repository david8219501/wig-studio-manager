import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { Order } from "../Sales/Sales";
import type { BulkItem } from "../../types";
import { formatDateIL, getMonthNameIL } from "../../utils/formatDate";
import "./Dashboard.css";

interface ClientRow {
  id: string;
  name: string;
  createdAt: Date | null;
}

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  new: "חדשה",
  in_progress: "בטיפול",
  styling: "בסירוק",
  ready: "מוכנה",
  delivered: "נמסרה",
};

function StatusBadge({ status }: { status: Order["status"] }) {
  const classByStatus: Record<Order["status"], string> = {
    new: "badge-new",
    in_progress: "badge-progress",
    styling: "badge-styling",
    ready: "badge-ready",
    delivered: "badge-ready",
  };
  return <span className={`dash-badge ${classByStatus[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

// פונקציה לקבלת ברכה דינמית לפי השעה ביום
function getGreeting(firstName: string) {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : "";
  if (hour >= 5 && hour < 12) return `בוקר טוב${name} 👋`;
  if (hour >= 12 && hour < 17) return `צהריים טובים${name} 👋`;
  if (hour >= 17 && hour < 21) return `ערב טוב${name} 👋`;
  return `לילה טוב${name} 🌙`;
}

function monthKey(dateStr: string) {
  return dateStr?.slice(0, 7); // "YYYY-MM"
}

export default function Dashboard() {
  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentDate = formatDateIL(new Date(), { weekday: "long", month: "long" });

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    getDoc(doc(db, "users", businessId))
      .then((snap) => setFirstName((snap.data() as { firstName?: string } | undefined)?.firstName || ""))
      .catch((err) => console.error("Error loading business profile:", err));

    const ordersUnsub = onSnapshot(
      query(collection(db, "orders"), where("businessId", "==", businessId)),
      (snapshot) => {
        setOrders(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading orders:", err);
        setLoadError("שגיאה בטעינת נתוני הדשבורד. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    const clientsUnsub = onSnapshot(
      query(collection(db, "clients"), where("businessId", "==", businessId)),
      (snapshot) => {
        setClients(
          snapshot.docs.map((d) => {
            const data = d.data() as { name?: string; createdAt?: { toDate: () => Date } };
            return {
              id: d.id,
              name: data.name || "",
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading clients:", err);
        setLoadError("שגיאה בטעינת נתוני הדשבורד. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    const bulkUnsub = onSnapshot(
      query(collection(db, "bulkItems"), where("businessId", "==", businessId)),
      (snapshot) => {
        setBulkItems(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BulkItem, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading bulk items:", err);
        setLoadError("שגיאה בטעינת נתוני הדשבורד. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => {
      ordersUnsub();
      clientsUnsub();
      bulkUnsub();
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const thisMonthRevenue = orders
      .filter((o) => monthKey(o.createdAt) === thisMonth)
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const lastMonthRevenue = orders
      .filter((o) => monthKey(o.createdAt) === lastMonth)
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const revenueTrendPct = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    const debtOrders = orders.filter((o) => (o.totalPrice || 0) > (o.paidAmount || 0));
    const openDebt = debtOrders.reduce((sum, o) => sum + (o.totalPrice - o.paidAmount), 0);

    const inProgressCount = orders.filter((o) =>
      ["new", "in_progress", "styling"].includes(o.status)
    ).length;
    const readyOrders = orders.filter((o) => o.status === "ready");

    const newClientsThisMonth = clients.filter(
      (c) => c.createdAt && monthKey(c.createdAt.toISOString()) === thisMonth
    ).length;
    const newClientsLastMonth = clients.filter(
      (c) => c.createdAt && monthKey(c.createdAt.toISOString()) === lastMonth
    ).length;

    // גרף הכנסות - 6 החודשים האחרונים
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: getMonthNameIL(d, "short"),
      });
    }
    const revenueChartData = months.map(({ key, label }) => ({
      month: label,
      income: orders.filter((o) => monthKey(o.createdAt) === key).reduce((s, o) => s + (o.totalPrice || 0), 0),
    }));

    // פילוח הכנסות לפי סוג עבודה
    const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const byType = new Map<string, number>();
    orders.forEach((o) => byType.set(o.orderType, (byType.get(o.orderType) || 0) + (o.totalPrice || 0)));
    const servicesBreakdown = Array.from(byType.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const recentOrders = [...orders]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5);

    const lowStockItems = bulkItems.filter((b) => b.quantity <= b.minThreshold);

    return {
      thisMonthRevenue,
      revenueTrendPct,
      openDebt,
      debtOrders,
      inProgressCount,
      readyOrders,
      newClientsThisMonth,
      newClientsDelta: newClientsThisMonth - newClientsLastMonth,
      revenueChartData,
      servicesBreakdown,
      recentOrders,
      lowStockItems,
    };
  }, [orders, clients, bulkItems]);

  const BREAKDOWN_COLORS = ["#9b69ff", "#3b82f6", "#f59e0b", "#10b981"];

  const alerts = [
    ...stats.readyOrders.slice(0, 3).map((o) => ({
      type: "success" as const,
      icon: "🎁",
      text: <><strong>מוכנה לאיסוף:</strong> ההזמנה של {o.clientName} מוכנה למסירה.</>,
    })),
    ...stats.lowStockItems.slice(0, 3).map((item) => ({
      type: "warning" as const,
      icon: "⚠️",
      text: <><strong>מלאי נמוך:</strong> נותרו רק {item.quantity} יח׳ מ-{item.name} במלאי.</>,
    })),
    ...stats.debtOrders.slice(0, 3).map((o) => ({
      type: "danger" as const,
      icon: "💰",
      text: <><strong>חוב פתוח:</strong> {o.clientName} עם יתרת חוב של ₪{(o.totalPrice - o.paidAmount).toLocaleString()}.</>,
    })),
  ];

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{getGreeting(firstName)}</h1>
          <p className="dash-subtitle">{currentDate} | סקירה כללית של הסלון</p>
        </div>
      </div>

      {loading && (
        <div className="dash-state">
          <div className="dash-state__spinner" />
          <p>טוענת נתוני דשבורד...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="dash-state dash-state--error">
          <span className="dash-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
      <>
      {/* KPI Cards */}
      <div className="dash-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon icon-purple">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">הכנסות החודש</span>
            <span className="kpi-value">₪{stats.thisMonthRevenue.toLocaleString()}</span>
            {stats.revenueTrendPct !== null ? (
              <span className={`kpi-trend ${stats.revenueTrendPct >= 0 ? "trend-up" : "trend-down"}`}>
                {stats.revenueTrendPct >= 0 ? "↑" : "↓"} {Math.abs(stats.revenueTrendPct)}% מחודש שעבר
              </span>
            ) : (
              <span className="kpi-trend trend-neutral">אין נתונים להשוואה מחודש שעבר</span>
            )}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-orange">💳</div>
          <div className="kpi-content">
            <span className="kpi-label">חובות פתוחים</span>
            <span className="kpi-value">₪{stats.openDebt.toLocaleString()}</span>
            <span className="kpi-trend trend-neutral">{stats.debtOrders.length} הזמנות עם יתרה לתשלום</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-blue">💇‍♀️</div>
          <div className="kpi-content">
            <span className="kpi-label">הזמנות בעבודה</span>
            <span className="kpi-value">{stats.inProgressCount}</span>
            <span className="kpi-trend trend-neutral">{stats.readyOrders.length} פאות מוכנות למסירה</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-green">👥</div>
          <div className="kpi-content">
            <span className="kpi-label">לקוחות חדשות (החודש)</span>
            <span className="kpi-value">{stats.newClientsThisMonth}</span>
            {stats.newClientsDelta !== 0 ? (
              <span className={`kpi-trend ${stats.newClientsDelta > 0 ? "trend-up" : "trend-down"}`}>
                {stats.newClientsDelta > 0 ? "↑" : "↓"} {Math.abs(stats.newClientsDelta)} מחודש שעבר
              </span>
            ) : (
              <span className="kpi-trend trend-neutral">כמו חודש שעבר</span>
            )}
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
                <BarChart data={stats.revenueChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeff1" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525866' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525866' }} />
                  <Tooltip
                    cursor={{ fill: '#f8f8fa' }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: unknown) => [`₪${Number(value).toLocaleString()}`, "הכנסה"]}
                  />
                  <Bar dataKey="income" name="הכנסה" radius={[6, 6, 0, 0]} barSize={40}>
                    {stats.revenueChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === stats.revenueChartData.length - 1 ? "#9b69ff" : "#ddd0ff"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="dash-card">
            <h2 className="dash-card-title">📋 הזמנות פעילות אחרונות</h2>
            {stats.recentOrders.length === 0 ? (
              <p className="text-muted">עדיין אין הזמנות במערכת.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>לקוחה</th>
                    <th>סוג עבודה</th>
                    <th>סטטוס</th>
                    <th>מחיר</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-bold">{order.clientName}</td>
                      <td>{order.orderType}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="mono font-bold">₪{order.totalPrice.toLocaleString()}</td>
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
            {alerts.length === 0 ? (
              <p className="text-muted">אין התראות כרגע.</p>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert, i) => (
                  <div key={i} className={`alert-item alert-${alert.type}`}>
                    <div className="alert-icon">{alert.icon}</div>
                    <div className="alert-text">{alert.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services Breakdown */}
          <div className="dash-card">
            <h2 className="dash-card-title">📊 התפלגות סוגי עבודה</h2>
            {stats.servicesBreakdown.length === 0 ? (
              <p className="text-muted">אין עדיין נתונים להצגה.</p>
            ) : (
              <div className="breakdown-list">
                {stats.servicesBreakdown.map((item, idx) => (
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
                        style={{ width: `${item.percent}%`, background: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length] }}
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
