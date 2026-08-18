import React, { useState } from "react";
import "./Expenses.css";

interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  category: "inventory" | "rent" | "marketing" | "salaries" | "other";
  description: string;
  amount: number;
  paymentMethod: "credit" | "transfer" | "cash" | "check";
  status: "paid" | "pending";
}

const DEMO_EXPENSES: Expense[] = [
  {
    id: "EXP-501",
    date: "2026-08-01",
    supplier: "יבואן שיער אירופאי",
    category: "inventory",
    description: "רכישת 5 קוקוים שיער גולמי (מלאי)",
    amount: 14500,
    paymentMethod: "transfer",
    status: "paid",
  },
  {
    id: "EXP-502",
    date: "2026-08-05",
    supplier: "פייסבוק / אינסטגרם",
    category: "marketing",
    description: "קמפיין פרסום ממומן - קולקציית קיץ",
    amount: 2200,
    paymentMethod: "credit",
    status: "paid",
  },
  {
    id: "EXP-503",
    date: "2026-08-10",
    supplier: "חברת ניהול נכסים",
    category: "rent",
    description: "שכירות סלון - חודש אוגוסט",
    amount: 8500,
    paymentMethod: "transfer",
    status: "paid",
  },
  {
    id: "EXP-504",
    date: "2026-08-12",
    supplier: "ספק ציוד וסדקית",
    category: "inventory",
    description: "רשתות לייס, מחטי תפירה וסיכות",
    amount: 1200,
    paymentMethod: "credit",
    status: "pending",
  },
  {
    id: "EXP-401",
    date: "2026-07-15",
    supplier: "ספק רשתות",
    category: "inventory",
    description: "רכישת ציוד חודש יולי",
    amount: 3400,
    paymentMethod: "credit",
    status: "paid",
  },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // 🆕 מצבי סינון זמן: "monthly" או "all"
  const [viewMode, setViewMode] = useState<"monthly" | "all">("monthly");
  const [selectedMonth, setSelectedMonth] = useState("2026-08"); // ברירת מחדל: אוגוסט 2026

  const [isModalOpen, setIsModalOpen] = useState(false);

  // טופס הוספה
  const [newSupplier, setNewSupplier] = useState("");
  const [newCategory, setNewCategory] = useState<Expense["category"]>("inventory");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState<number | "">("");
  const [newMethod, setNewMethod] = useState<Expense["paymentMethod"]>("credit");

  // 1. סינון לפי זמן (חודשי vs כללי)
  const timeFilteredExpenses = expenses.filter((e) => {
    if (viewMode === "all") return true;
    return e.date.startsWith(selectedMonth);
  });

  // 2. סינון לפי חיפוש וקטגוריה
  const filtered = timeFilteredExpenses.filter((e) => {
    const matchesSearch =
      e.supplier.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // חישובים דינמיים בהתאם לזמן שנבחר
  const totalExpenses = timeFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const inventoryExpenses = timeFilteredExpenses
    .filter((e) => e.category === "inventory")
    .reduce((sum, e) => sum + e.amount, 0);
  const operationalExpenses = totalExpenses - inventoryExpenses;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier || !newAmount) return;

    const newEntry: Expense = {
      id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      supplier: newSupplier,
      category: newCategory,
      description: newDescription,
      amount: Number(newAmount),
      paymentMethod: newMethod,
      status: "paid",
    };

    setExpenses([newEntry, ...expenses]);
    setIsModalOpen(false);

    setNewSupplier("");
    setNewDescription("");
    setNewAmount("");
  };

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="expenses-header">
        <div>
          <h1>ניהול הוצאות תפעול ומלאי</h1>
          <p className="subtitle">
            {viewMode === "monthly"
              ? `תצוגה חודשית (${selectedMonth})`
              : "תצוגה כללית (כל הזמנים)"}
          </p>
        </div>

        <div className="header-actions">
          {/* 🆕 סרגל החלפה בין חודשי לכללי */}
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "monthly" ? "active" : ""}`}
              onClick={() => setViewMode("monthly")}
            >
              📅 חודשי
            </button>
            <button
              className={`toggle-btn ${viewMode === "all" ? "active" : ""}`}
              onClick={() => setViewMode("all")}
            >
              🌐 כללי
            </button>
          </div>

          {viewMode === "monthly" && (
            <input
              type="month"
              className="month-picker"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          )}

          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + הוספת הוצאה
          </button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="expenses-summary-grid">
        <div className="summary-card">
          <span className="summary-title">
            {viewMode === "monthly" ? "סה\"כ הוצאות החודש" : "סה\"כ הוצאות כללי"}
          </span>
          <span className="summary-value danger">₪{totalExpenses.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">הוצאות מלאי וספקים</span>
          <span className="summary-value">₪{inventoryExpenses.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">הוצאות תפעול ושיווק</span>
          <span className="summary-value">₪{operationalExpenses.toLocaleString()}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="expenses-toolbar">
        <input
          type="text"
          className="expenses-search"
          placeholder="חיפוש לפי ספק, תיאור או מזהה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="expenses-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">כל הקטגוריות</option>
          <option value="inventory">📦 מלאי ושיער</option>
          <option value="rent">🏢 שכירות ומבנה</option>
          <option value="marketing">📣 שיווק ופרסום</option>
          <option value="salaries">👥 שכר עובדות</option>
          <option value="other">🛠️ שונות</option>
        </select>
      </div>

      {/* Table */}
      <div className="expenses-table-wrapper">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>מזהה</th>
              <th>תאריך</th>
              <th>ספק / מוטב</th>
              <th>קטגוריה</th>
              <th>תיאור ההוצאה</th>
              <th>סכום</th>
              <th>אמצעי תשלום</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  לא נמצאו הוצאות לתקופה הנבחרת.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.id}</td>
                  <td className="mono">{e.date}</td>
                  <td className="font-bold">{e.supplier}</td>
                  <td>
                    <span className="category-tag">
                      {e.category === "inventory" && "📦 מלאי"}
                      {e.category === "rent" && "🏢 שכירות"}
                      {e.category === "marketing" && "📣 שיווק"}
                      {e.category === "salaries" && "👥 שכר"}
                      {e.category === "other" && "🛠️ שונות"}
                    </span>
                  </td>
                  <td>{e.description || "—"}</td>
                  <td className="mono text-danger font-bold">₪{e.amount.toLocaleString()}</td>
                  <td>
                    {e.paymentMethod === "credit" && "💳 אשראי"}
                    {e.paymentMethod === "transfer" && "🏦 העברה"}
                    {e.paymentMethod === "cash" && "💵 מזומן"}
                    {e.paymentMethod === "check" && "📜 צ'ק"}
                  </td>
                  <td>
                    <span className={`badge badge-${e.status}`}>
                      {e.status === "paid" ? "שולם" : "ממתין לתשלום"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Add Expense */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>רישום הוצאה חדשה</h2>
            <form onSubmit={handleAddExpense} className="modal-form">
              <div className="form-group">
                <label>שם הספק / המוטב</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: ספק רשתות"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>קטגוריה</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Expense["category"])}
                >
                  <option value="inventory">📦 מלאי ושיער</option>
                  <option value="rent">🏢 שכירות ומבנה</option>
                  <option value="marketing">📣 שיווק ופרסום</option>
                  <option value="salaries">👥 שכר עובדות</option>
                  <option value="other">🛠️ שונות</option>
                </select>
              </div>

              <div className="form-group">
                <label>סכום (₪)</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>אמצעי תשלום</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value as Expense["paymentMethod"])}
                >
                  <option value="credit">💳 אשראי</option>
                  <option value="transfer">🏦 העברה בנקאית</option>
                  <option value="cash">💵 מזומן</option>
                  <option value="check">📜 צ'ק</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>תיאור / פירוט נוסף</label>
                <textarea
                  rows={2}
                  placeholder="פירוט חופשי..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn-primary">
                  שמירת הוצאה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}