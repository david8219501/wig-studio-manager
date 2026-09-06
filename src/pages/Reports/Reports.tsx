import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { Order } from "../Sales/Sales";
import { isUnsoldShowroomStock } from "../../utils/orderCreation";
import { calculateOrderProfit } from "../../utils/orderProfit";
import type { BulkItem } from "../../types";
import { getMonthNameIL } from "../../utils/formatDate";
import "./Reports.css";

// אותם 4 סוגי עבודה בדיוק שהאתר יוצר בפועל (ORDER_TYPE_LABELS ב-
// NewOrderWizard.tsx, ותוויות קבועות ב-RepairOrderForm/
// ShowroomStockFormModal/QuickRetailSaleModal) - סדר קבוע לצבעים
// עקביים בגרף מחודש לחודש.
const PROFIT_ORDER_TYPES = ["פאה חדשה", "תיקון / שירות", "מוצר קמעונאי", "פאת תצוגה"];
const PROFIT_TYPE_COLORS = ["#9b69ff", "#3b82f6", "#f59e0b", "#10b981"];

// הזמנות "בוטלה" (OrderDetailsPanel.tsx - ביטול הזמנה) מוחרגות מכל
// חישובי הרווח/החוב בדף הזה - אותו סטטוס קבוע, לא מיובא כי הוא local
// const לא-מיוצא שם (עקבי עם המוסכמה הקיימת של קבועים מקומיים קטנים).
const CANCELLED_STATUS = "בוטלה";

interface ExpenseRow {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

function monthKey(dateStr: string) {
  return dateStr?.slice(0, 7); // "YYYY-MM"
}

function yearKey(dateStr: string) {
  return dateStr?.slice(0, 4); // "YYYY"
}

function formatPct(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const ordersUnsub = onSnapshot(
      query(collection(db, "orders"), where("businessId", "==", businessId)),
      (snapshot) => {
        setOrders(
          snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }))
            .filter((order) => !isUnsoldShowroomStock(order))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading orders:", err);
        setLoadError("שגיאה בטעינת נתוני הדוחות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    const expensesUnsub = onSnapshot(
      query(collection(db, "expenses"), where("businessId", "==", businessId)),
      (snapshot) => {
        setExpenses(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseRow, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading expenses:", err);
        setLoadError("שגיאה בטעינת נתוני הדוחות. בדקי את החיבור ונסי לרענן את הדף.");
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
        setLoadError("שגיאה בטעינת נתוני הדוחות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => {
      ordersUnsub();
      expensesUnsub();
      bulkUnsub();
    };
  }, []);

  const report = useMemo(() => {
    const now = new Date();
    const thisYear = String(now.getFullYear());
    const lastYear = String(now.getFullYear() - 1);

    const ordersThisYear = orders.filter((o) => yearKey(o.createdAt) === thisYear);
    const ordersLastYear = orders.filter((o) => yearKey(o.createdAt) === lastYear);
    const expensesThisYear = expenses.filter((e) => yearKey(e.date) === thisYear);
    const expensesLastYear = expenses.filter((e) => yearKey(e.date) === lastYear);

    const revenueThisYear = ordersThisYear.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const revenueLastYear = ordersLastYear.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const expensesSumThisYear = expensesThisYear.reduce((s, e) => s + (e.amount || 0), 0);
    const expensesSumLastYear = expensesLastYear.reduce((s, e) => s + (e.amount || 0), 0);

    const avgOrderThisYear = ordersThisYear.length > 0 ? revenueThisYear / ordersThisYear.length : 0;
    const avgOrderLastYear = ordersLastYear.length > 0 ? revenueLastYear / ordersLastYear.length : 0;

    const profitThisYear = revenueThisYear - expensesSumThisYear;
    const profitLastYear = revenueLastYear - expensesSumLastYear;

    // אחוז לקוחות חוזרות - מתוך הלקוחות שביצעו הזמנה, כמה הזמינו יותר מפעם אחת
    const ordersByClient = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.clientName) return;
      ordersByClient.set(o.clientName, (ordersByClient.get(o.clientName) || 0) + 1);
    });
    const totalOrderingClients = ordersByClient.size;
    const repeatClients = Array.from(ordersByClient.values()).filter((count) => count > 1).length;
    const repeatClientsPct = totalOrderingClients > 0 ? Math.round((repeatClients / totalOrderingClients) * 100) : 0;

    // טבלת ביצועים חודשית - 6 החודשים האחרונים
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: getMonthNameIL(d, "long"),
      });
    }
    const monthlyRows = months
      .map(({ key, label }) => {
        const monthOrders = orders.filter((o) => monthKey(o.createdAt) === key);
        const monthExpenses = expenses.filter((e) => monthKey(e.date) === key);
        const income = monthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
        const exp = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

        const byType = new Map<string, number>();
        monthOrders.forEach((o) => byType.set(o.orderType, (byType.get(o.orderType) || 0) + (o.totalPrice || 0)));
        const topService = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        return { month: label, income, exp, profit: income - exp, orders: monthOrders.length, topService };
      })
      .filter((row) => row.orders > 0 || row.exp > 0)
      .reverse();

    // קבוצה 1: רווחיות לפי סוג עבודה, לאורך 12 חודשים - סך כולל (לא
    // ממוצע) שכל סוג עבודה הביא, מקובץ לפי orderType. calculateOrderProfit
    // (רווח נטו, לא totalPrice גולמי) על כל הזמנה. הזמנות "בוטלה" מוחרגות.
    const months12: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months12.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: getMonthNameIL(d, "short"),
      });
    }
    const profitByTypeMonthly = months12.map(({ key, label }) => {
      const monthOrders = orders.filter(
        (o) => monthKey(o.createdAt) === key && o.status !== CANCELLED_STATUS
      );
      const row: Record<string, string | number> = { month: label };
      PROFIT_ORDER_TYPES.forEach((type) => {
        row[type] = Math.round(
          monthOrders.filter((o) => o.orderType === type).reduce((sum, o) => sum + calculateOrderProfit(o), 0)
        );
      });
      return row;
    });

    // זמינות מלאי - המדד היחיד ב"יעילות תפעולית" עם מקור נתונים אמיתי היום
    const inventoryAvailabilityPct = bulkItems.length > 0
      ? Math.round((bulkItems.filter((b) => b.quantity > b.minThreshold).length / bulkItems.length) * 100)
      : null;

    return {
      summaryStats: [
        {
          label: 'סה"כ הכנסות שנתי',
          value: `₪${Math.round(revenueThisYear).toLocaleString()}`,
          change: formatPct(revenueThisYear, revenueLastYear),
        },
        {
          label: "ממוצע הזמנה",
          value: `₪${Math.round(avgOrderThisYear).toLocaleString()}`,
          change: formatPct(avgOrderThisYear, avgOrderLastYear),
        },
        {
          label: "לקוחות חוזרות",
          value: `${repeatClientsPct}%`,
          change: totalOrderingClients > 0 ? `מתוך ${totalOrderingClients} לקוחות עם הזמנות` : null,
        },
        {
          label: "רווח משוער",
          value: `₪${Math.round(profitThisYear).toLocaleString()}`,
          change: formatPct(profitThisYear, profitLastYear),
        },
      ],
      monthlyRows,
      profitByTypeMonthly,
      inventoryAvailabilityPct,
    };
  }, [orders, expenses, bulkItems]);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>דוחות וניתוח נתונים</h1>
        <p>סקירה עסקית מעמיקה, ביצועים פיננסיים ופילוח שירותים</p>
      </div>

      {loading && (
        <div className="reports-state">
          <div className="reports-state__spinner" />
          <p>טוענת נתוני דוחות...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="reports-state reports-state--error">
          <span className="reports-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
      <>
      {/* KPI Row */}
      <div className="reports-stats-grid">
        {report.summaryStats.map((stat, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            {stat.change && <span className="stat-change">{stat.change}{stat.change.startsWith("+") || stat.change.startsWith("-") ? " מתקופה קודמת" : ""}</span>}
          </div>
        ))}
      </div>

      <div className="reports-main-grid">
        {/* Sales Report Table */}
        <div className="reports-card full-width">
          <h2 className="reports-title">דו"ח מכירות מפורט</h2>
          {report.monthlyRows.length === 0 ? (
            <p>עדיין אין מספיק נתונים כדי להציג דו"ח חודשי.</p>
          ) : (
            <div className="reports-table-wrapper">
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
                  {report.monthlyRows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.month}</td>
                      <td className="mono">₪{Math.round(row.income).toLocaleString()}</td>
                      <td className="mono text-danger">₪{Math.round(row.exp).toLocaleString()}</td>
                      <td className="mono font-bold text-success">₪{Math.round(row.profit).toLocaleString()}</td>
                      <td>{row.orders}</td>
                      <td><span className="tag-service">{row.topService}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* קבוצה 1: רווחיות לפי סוג עבודה - 12 חודשים אחרונים */}
        <div className="reports-card full-width">
          <h2 className="reports-title">רווחיות לפי סוג עבודה - 12 חודשים אחרונים</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.profitByTypeMonthly} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeff1" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#525866" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#525866" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(value: unknown, name: unknown) => [`₪${Number(value).toLocaleString()}`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {PROFIT_ORDER_TYPES.map((type, i) => (
                  <Bar key={type} dataKey={type} name={type} stackId="profit" fill={PROFIT_TYPE_COLORS[i]} radius={i === PROFIT_ORDER_TYPES.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Report */}
        <div className="reports-card">
          <h2 className="reports-title">יעילות תפעולית</h2>
          {report.inventoryAvailabilityPct === null ? (
            <p>אין עדיין פריטי מלאי במערכת כדי לחשב זמינות.</p>
          ) : (
            <div className="efficiency-bars">
              <div className="eff-row">
                <span>זמינות מלאי (מעל סף מינימום)</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${report.inventoryAvailabilityPct}%` }} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
