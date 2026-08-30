import React, { useEffect, useState } from "react";
import { collection, addDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import "./Expenses.css";

interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  category: "inventory" | "rent" | "marketing" | "salaries" | "production" | "other";
  description: string;
  amount: number;
  paymentMethod: "credit" | "transfer" | "cash" | "check";
  status: "paid" | "pending";
  relatedOrderId?: string; // אם קיים - ההוצאה נוצרה אוטומטית מהזמנה (src/utils/orderCreation.ts) ומתעדכנת יחד איתה
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // עריכה ידנית של סכום הוצאה בטבלה (כולל הוצאות מקושרות להזמנה - הקישור לא נועל את הסכום)
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<number | "">("");

  // האזנה חיה ל-Firestore, מסוננת רק להוצאות של העסק המחובר (businessId = uid)
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const expensesQuery = query(collection(db, "expenses"), where("businessId", "==", businessId));
    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Expense, "id">),
        }));
        setExpenses(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading expenses:", err);
        setLoadError("שגיאה בטעינת ההוצאות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier || !newAmount) return;

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSaving(true);
    setSaveError(null);
    try {
      await addDoc(collection(db, "expenses"), {
        date: new Date().toISOString().split("T")[0],
        supplier: newSupplier,
        category: newCategory,
        description: newDescription,
        amount: Number(newAmount),
        paymentMethod: newMethod,
        status: "paid",
        businessId,
      });

      setIsModalOpen(false);
      setNewSupplier("");
      setNewDescription("");
      setNewAmount("");
    } catch (err) {
      console.error("Error adding expense:", err);
      setSaveError("שגיאה בשמירת ההוצאה. בדקי את החיבור ונסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  const startEditAmount = (expense: Expense) => {
    setEditingAmountId(expense.id);
    setEditingAmountValue(expense.amount);
  };

  const saveEditAmount = async (id: string) => {
    if (editingAmountValue === "") {
      setEditingAmountId(null);
      return;
    }
    const value = Number(editingAmountValue);
    setEditingAmountId(null);
    try {
      await updateDoc(doc(db, "expenses", id), { amount: value });
    } catch (err) {
      console.error("Error updating expense amount:", err);
      alert("שגיאה בעדכון הסכום. נסי שוב.");
    }
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
          <option value="production">🧵 ייצור הזמנות</option>
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
            {loading ? (
              <tr>
                <td colSpan={8} className="empty-row expenses-state">
                  <div className="expenses-state__spinner" />
                  <span>טוענת הוצאות...</span>
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={8} className="empty-row expenses-state expenses-state--error">
                  <span className="expenses-state__icon">⚠️</span>
                  <span>{loadError}</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  לא נמצאו הוצאות לתקופה הנבחרת.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td dir="ltr" title={e.id}>#{e.id.slice(-6)}</td>
                  <td className="mono" dir="ltr">{e.date}</td>
                  <td className="font-bold">{e.supplier}</td>
                  <td>
                    <span className="category-tag">
                      {e.category === "inventory" && "📦 מלאי"}
                      {e.category === "rent" && "🏢 שכירות"}
                      {e.category === "marketing" && "📣 שיווק"}
                      {e.category === "salaries" && "👥 שכר"}
                      {e.category === "production" && "🧵 ייצור"}
                      {e.category === "other" && "🛠️ שונות"}
                    </span>
                  </td>
                  <td>
                    {e.description || "—"}
                    {e.relatedOrderId && (
                      <span className="linked-order-badge" title={`מקושרת להזמנה #${e.relatedOrderId}`}>
                        🔗 מקושר להזמנה
                      </span>
                    )}
                  </td>
                  <td className="mono text-danger font-bold">
                    {editingAmountId === e.id ? (
                      <input
                        type="number"
                        autoFocus
                        className="amount-edit-input"
                        value={editingAmountValue}
                        onChange={(ev) => setEditingAmountValue(ev.target.value === "" ? "" : Number(ev.target.value))}
                        onBlur={() => saveEditAmount(e.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") saveEditAmount(e.id);
                          if (ev.key === "Escape") setEditingAmountId(null);
                        }}
                      />
                    ) : (
                      <span className="editable-amount" title="לחצי לעריכת הסכום" onClick={() => startEditAmount(e)}>
                        ₪{e.amount.toLocaleString()}
                      </span>
                    )}
                  </td>
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
                  <option value="production">🧵 ייצור הזמנות</option>
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
                {saveError && <span className="field-error">{saveError}</span>}
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  ביטול
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "שומר..." : "שמירת הוצאה"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}