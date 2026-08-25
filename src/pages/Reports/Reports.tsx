import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import "./Reports.css";

interface OrderDoc {
  id: string;
  clientId?: string;
  orderType: string;
  status: "new" | "in_progress" | "styling" | "ready" | "delivered";
  totalPrice: number;
  paidAmount: number;
  createdAt: string; // YYYY-MM-DD
}

interface ExpenseDoc {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

interface BulkItemDoc {
  id: string;
  quantity: number;
  minThreshold: number;
}

const MONTH_NAMES_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export default function Reports() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItemDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) {
      setLoading(false);
      return;
    }

    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), where("businessId", "==", businessId)),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderDoc, "id">) })));
        setLoading(false);
      },
      (err) => { console.error("Error loading orders for reports:", err); setLoading(false); }
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, "expenses"), where("businessId", "==", businessId)),
      (snap) => setExpenses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseDoc, "id">) })))
    );

    const unsubBulk = onSnapshot(
      query(collection(db, "bulkItems"), where("businessId", "==", businessId)),
      (snap) => setBulkItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BulkItemDoc, "id">) })))
    );

    return () => {
      unsubOrders();
      unsubExpenses();
      unsubBulk();
    };
  }, []);

  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  const summary = useMemo(() => {
    const thisYearOrders = orders.filter((o) => o.createdAt?.startsWith(String(thisYear)));
    const lastYearOrders = orders.filter((o) => o.createdAt?.startsWith(String(lastYear)));

    const yearRevenue = thisYearOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const lastYearRevenue = lastYearOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const revenueChange = lastYearRevenue > 0 ? Math.round(((yearRevenue - lastYearRevenue) / lastYearRevenue) * 100) : null;

    const avgOrder = thisYearOrders.length > 0 ? Math.round(yearRevenue / thisYearOrders.length) : 0;

    const clientCounts = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.clientId) return;
      clientCounts.set(o.clientId, (clientCounts.get(o.clientId) || 0) + 1);
    });
    const totalClientsWithOrders = clientCounts.size;
    const repeatClients = Array.from(clientCounts.values()).filter((c) => c > 1).length;
    const repeatRate = totalClientsWithOrders > 0 ? Math.round((repeatClients / totalClientsWithOrders) * 100) : 0;

    const yearExpenses = expenses
      .filter((e) => e.date?.startsWith(String(thisYear)))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const estimatedProfit = yearRevenue - yearExpenses;

    return { yearRevenue, revenueChange, avgOrder, repeatRate, estimatedProfit, yearExpenses };
  }, [orders, expenses, thisYear, lastYear]);

  const monthlyRows = useMemo(() => {
    const rows: { key: string; label: string; revenue: number; expenses: number; orderCount: number; topService: string }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      rows.push({ key, label: MONTH_NAMES_HE[d.getMonth()], revenue: 0, expenses: 0, orderCount: 0, topService: "—" });
    }

    rows.forEach((row) => {
      const monthOrders = orders.filter((o) => o.createdAt?.startsWith(row.key));
      row.revenue = monthOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      row.orderCount = monthOrders.length;
      row.expenses = expenses
        .filter((e) => e.date?.startsWith(row.key))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const typeCounts = new Map<string, number>();
      monthOrders.forEach((o) => {
        const t = o.orderType || "אחר";
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      });
      let topType = "—";
      let max = 0;
      typeCounts.forEach((count, type) => {
        if (count > max) { max = count; topType = type; }
      });
      row.topService = topType;
    });

    return rows;
  }, [orders, expenses]);

  const efficiency = useMemo(() => {
    const total = orders.length;
    const deliveredOnRecord = orders.filter((o) => o.status === "delivered").length;
    const deliveryRate = total > 0 ? Math.round((deliveredOnRecord / total) * 100) : 0;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

    const stockOk = bulkItems.filter((b) => b.quantity >= b.minThreshold).length;
    const stockRate = bulkItems.length > 0 ? Math.round((stockOk / bulkItems.length) * 100) : 100;

    return [
      { label: "אחוז הזמנות שנמסרו", value: deliveryRate },
      { label: "אחוז גביית תשלומים", value: collectionRate },
      { label: "זמינות מלאי תקינה", value: stockRate },
    ];
  }, [orders, bulkItems]);

  const insights = useMemo(() => {
    const list: string[] = [];
    const lowStockCount = bulkItems.filter((b) => b.quantity < b.minThreshold).length;
    if (lowStockCount > 0) {
      list.push(`יש ${lowStockCount} פריטים במלאי הפשוט שמתחת לסף המינימום - מומלץ להזמין השלמה.`);
    }

    const openDebt = orders.reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.paidAmount || 0)), 0);
    if (openDebt > 0) {
      list.push(`סך החובות הפתוחים מלקוחות עומד על ₪${openDebt.toLocaleString()}.`);
    }

    if (summary.revenueChange !== null) {
      list.push(
        summary.revenueChange >= 0
          ? `ההכנסות השנה גבוהות ב-${summary.revenueChange}% לעומת השנה הקודמת.`
          : `ההכנסות השנה נמוכות ב-${Math.abs(summary.revenueChange)}% לעומת השנה הקודמת.`
      );
    }

    if (list.length === 0) {
      list.push("אין עדיין מספיק נתונים כדי להציג תובנות משמעותיות.");
    }

    return list;
  }, [bulkItems, orders, summary]);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>דוחות וניתוח נתונים</h1>
        <p>סקירה עסקית מעמיקה, ביצועים פיננסיים ופילוח שירותים</p>
      </div>

      {loading ? (
        <div className="reports-card">
          <p>טוענת נתוני דוחות...</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="reports-stats-grid">
            <div className="stat-card">
              <span className="stat-label">סה"כ הכנסות שנתי</span>
              <span className="stat-value">₪{summary.yearRevenue.toLocaleString()}</span>
              <span className="stat-change">
                {summary.revenueChange !== null ? `${summary.revenueChange >= 0 ? "+" : ""}${summary.revenueChange}%` : "—"} מהשנה הקודמת
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">ממוצע הזמנה</span>
              <span className="stat-value">₪{summary.avgOrder.toLocaleString()}</span>
              <span className="stat-change">מבוסס על השנה הנוכחית</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">לקוחות חוזרות</span>
              <span className="stat-value">{summary.repeatRate}%</span>
              <span className="stat-change">מתוך לקוחות עם הזמנה</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">רווח משוער</span>
              <span className="stat-value">₪{summary.estimatedProfit.toLocaleString()}</span>
              <span className="stat-change">הכנסות פחות הוצאות (השנה)</span>
            </div>
          </div>

          <div className="reports-main-grid">
            {/* Sales Report Table */}
            <div className="reports-card full-width">
              <h2 className="reports-title">דו"ח מכירות מפורט</h2>
              {monthlyRows.every((r) => r.orderCount === 0) ? (
                <p className="text-muted">אין עדיין הזמנות בטווח הזמן הזה.</p>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>חודש</th>
                      <th>הכנסות (₪)</th>
                      <th>הוצאות (₪)</th>
                      <th>רווח נקי (₪)</th>
                      <th>מספר הזמנות</th>
                      <th>שירות מוביל</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className="mono">₪{row.revenue.toLocaleString()}</td>
                        <td className="mono text-danger">₪{row.expenses.toLocaleString()}</td>
                        <td className="mono font-bold text-success">₪{(row.revenue - row.expenses).toLocaleString()}</td>
                        <td>{row.orderCount}</td>
                        <td><span className="tag-service">{row.topService}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Efficiency Report */}
            <div className="reports-card">
              <h2 className="reports-title">יעילות תפעולית</h2>
              <div className="efficiency-bars">
                {efficiency.map((item, i) => (
                  <div key={i} className="eff-row">
                    <span>{item.label}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${item.value}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights Box */}
            <div className="reports-card insights">
              <h2 className="reports-title">תובנות מהמערכת</h2>
              <ul className="insights-list">
                {insights.map((text, i) => <li key={i}>{text}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
