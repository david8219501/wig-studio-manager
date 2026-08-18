import React from "react";
import "./Reports.css";

// נתוני דמו לסיכום דוחות
const SUMMARY_STATS = [
  { label: "סה\"כ הכנסות שנתי", value: "₪482,000", change: "+14%" },
  { label: "ממוצע הזמנה", value: "₪4,200", change: "+5%" },
  { label: "לקוחות חוזרות", value: "68%", change: "+2%" },
  { label: "רווח משוער", value: "₪210,000", change: "+8%" },
];

export default function Reports() {
  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>דוחות וניתוח נתונים</h1>
        <p>סקירה עסקית מעמיקה, ביצועים פיננסיים ופילוח שירותים</p>
      </div>

      {/* KPI Row */}
      <div className="reports-stats-grid">
        {SUMMARY_STATS.map((stat, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            <span className="stat-change">{stat.change} מתקופה קודמת</span>
          </div>
        ))}
      </div>

      <div className="reports-main-grid">
        {/* Sales Report Table */}
        <div className="reports-card full-width">
          <h2 className="reports-title">דו"ח מכירות מפורט</h2>
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
              {[
                { m: 'אוגוסט', inc: 45200, exp: 17800, profit: 27400, orders: 42, top: 'פאה חדשה' },
                { m: 'יולי', inc: 38500, exp: 15200, profit: 23300, orders: 38, top: 'פאה חדשה' },
                { m: 'יוני', inc: 41000, exp: 16000, profit: 25000, orders: 40, top: 'תיקונים' },
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row.m}</td>
                  <td className="mono">₪{row.inc.toLocaleString()}</td>
                  <td className="mono text-danger">₪{row.exp.toLocaleString()}</td>
                  <td className="mono font-bold text-success">₪{row.profit.toLocaleString()}</td>
                  <td>{row.orders}</td>
                  <td><span className="tag-service">{row.top}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Efficiency Report */}
        <div className="reports-card">
          <h2 className="reports-title">יעילות תפעולית</h2>
          <div className="efficiency-bars">
            {['זמן טיפול ממוצע', 'דירוג לקוחות', 'זמינות מלאי'].map((item, i) => (
              <div key={i} className="eff-row">
                <span>{item}</span>
                <div className="bar-track"><div className="bar-fill" style={{width: `${70 + i*10}%`}} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Box */}
        <div className="reports-card insights">
          <h2 className="reports-title">תובנות מהמערכת</h2>
          <ul className="insights-list">
            <li>נרשמה עלייה של 15% בהזמנות לתיקונים בחודש האחרון.</li>
            <li>לקוחות חוזרות (חפיפות) הן עוגן יציב של 20% מהמחזור.</li>
            <li>מומלץ לבצע הזמנת מלאי של רשתות סקין לפני ספטמבר.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}