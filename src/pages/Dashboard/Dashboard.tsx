import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import "./Dashboard.css";

// ─── Demo Data ─────────────────────────────────────────────────────────

const REVENUE_DATA = [
  { month: "מרץ", income: 28000 },
  { month: "אפר", income: 32000 },
  { month: "מאי", income: 29000 },
  { month: "יוני", income: 41000 },
  { month: "יולי", income: 38500 },
  { month: "אוג", income: 45200 },
];

const SERVICES_BREAKDOWN = [
  { name: "פאות חדשות", percent: 65, color: "#9b69ff", amount: "₪29,380" },
  { name: "תיקונים ושדרוגים", percent: 20, color: "#32c589", amount: "₪9,040" },
  { name: "חפיפה וסירוק", percent: 10, color: "#f2994a", amount: "₪4,520" },
  { name: "תוספות שיער", percent: 5, color: "#7094ee", amount: "₪2,260" },
];

const RECENT_ORDERS = [
  { id: "ORD-901", client: "שרה לוי", type: "פאה חדשה", status: "ready", price: 18000 },
  { id: "ORD-902", client: "מירי כהן", type: "תיקון רשת", status: "in_progress", price: 1200 },
  { id: "ORD-903", client: "רחלי פרידמן", type: "תוספת צבע", status: "styling", price: 2200 },
  { id: "ORD-904", client: "לאה שוורץ", type: "פאה חדשה", status: "new", price: 14500 },
];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new": return <span className="dash-badge badge-new">חדשה 🆕</span>;
    case "in_progress": return <span className="dash-badge badge-progress">בטיפול ⏳</span>;
    case "styling": return <span className="dash-badge badge-styling">בסירוק 💇‍♀️</span>;
    case "ready": return <span className="dash-badge badge-ready">מוכנה 🎁</span>;
    default: return null;
  }
}

// פונקציה לקבלת ברכה דינמית לפי השעה ביום
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "בוקר טוב, אסתי 👋";
  if (hour >= 12 && hour < 17) return "צהריים טובים, אסתי 👋";
  if (hour >= 17 && hour < 21) return "ערב טוב, אסתי 👋";
  return "לילה טוב, אסתי 🌙";
}

export default function Dashboard() {
  const currentDate = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{getGreeting()}</h1>
          <p className="dash-subtitle">{currentDate} | סקירה כללית של הסלון</p>
        </div>
        <div className="dash-quick-actions">
          <button className="btn-dash-secondary">➕ לקוחה חדשה</button>
          <button className="btn-dash-primary">✨ פתיחת הזמנה</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon icon-purple">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">הכנסות החודש</span>
            <span className="kpi-value">₪45,200</span>
            <span className="kpi-trend trend-up">↑ 12% מחודש שעבר</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-orange">💳</div>
          <div className="kpi-content">
            <span className="kpi-label">חובות פתוחים</span>
            <span className="kpi-value">₪14,500</span>
            <span className="kpi-trend trend-down">↓ 3% מחודש שעבר</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-blue">💇‍♀️</div>
          <div className="kpi-content">
            <span className="kpi-label">הזמנות בעבודה</span>
            <span className="kpi-value">24</span>
            <span className="kpi-trend trend-neutral">4 פאות מוכנות למסירה</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon icon-green">👥</div>
          <div className="kpi-content">
            <span className="kpi-label">לקוחות חדשות (החודש)</span>
            <span className="kpi-value">8</span>
            <span className="kpi-trend trend-up">↑ 2 יותר מחודש שעבר</span>
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
                <BarChart data={REVENUE_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6f7" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#63537a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#63537a' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8f3fa' }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, "הכנסה"]}
                  />
                  <Bar dataKey="income" name="הכנסה" radius={[6, 6, 0, 0]} barSize={40}>
                    {REVENUE_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === REVENUE_DATA.length - 1 ? "#9b69ff" : "#d6bfed"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="dash-card">
            <h2 className="dash-card-title">📋 הזמנות פעילות אחרונות</h2>
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
                {RECENT_ORDERS.map((order) => (
                  <tr key={order.id}>
                    <td className="mono font-bold text-muted">{order.id}</td>
                    <td className="font-bold">{order.client}</td>
                    <td>{order.type}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="mono font-bold">₪{order.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="dash-right-col">
          
          {/* Smart Alerts */}
          <div className="dash-card">
            <h2 className="dash-card-title">🔔 מרכז התראות</h2>
            <div className="alerts-list">
              <div className="alert-item alert-success">
                <div className="alert-icon">🎁</div>
                <div className="alert-text">
                  <strong>מוכנה לאיסוף:</strong> הפאה של שרה לוי עברה סירוק וממתינה למסירה.
                </div>
              </div>
              <div className="alert-item alert-warning">
                <div className="alert-icon">⚠️</div>
                <div className="alert-text">
                  <strong>מלאי נמוך:</strong> נותרו רק 2 רשתות סקין במידה S במלאי.
                </div>
              </div>
              <div className="alert-item alert-danger">
                <div className="alert-icon">💰</div>
                <div className="alert-text">
                  <strong>חוב פתוח:</strong> מירי כהן מסרה פאה לתיקון וטרם העבירה מקדמה.
                </div>
              </div>
            </div>
          </div>

          {/* Services Breakdown */}
          <div className="dash-card">
            <h2 className="dash-card-title">📊 התפלגות סוגי עבודה</h2>
            <div className="breakdown-list">
              {SERVICES_BREAKDOWN.map((item, idx) => (
                <div key={idx} className="breakdown-item">
                  <div className="breakdown-info">
                    <span className="breakdown-name font-bold">{item.name}</span>
                    <div className="breakdown-numbers">
                      <span className="breakdown-amount mono">{item.amount}</span>
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
          </div>

        </div>
      </div>
    </div>
  );
}