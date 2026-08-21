import { useState, useEffect } from "react";
import type { Client } from "../../pages/Clients/Clients";
import NewOrderWizard from "../orders/NewOrderWizard";
import "./ClientDrawer.css";

interface ClientDrawerProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient?: (updatedClient: Client) => void;
}

export default function ClientDrawer({ client, isOpen, onClose, onUpdateClient }: ClientDrawerProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "specs" | "docs">("orders");
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // State עבור מצב עריכת מידות ומפרט
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [measurements, setMeasurements] = useState("");
  const [notes, setNotes] = useState("");

  // סנכרון הנתונים בטעינת הלקוחה
  useEffect(() => {
    if (client) {
      setMeasurements(client.measurements || 'מידה M - היקף 54 ס"מ');
      setNotes(client.notes || "מעדיפה לייס שקוף דק, רגישות קלה בעורף.");
      setIsEditingSpecs(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleSaveSpecs = () => {
    setIsEditingSpecs(false);
    const updated = {
      ...client,
      measurements,
      notes,
    };
    if (onUpdateClient) {
      onUpdateClient(updated);
    }
  };

  // נתוני דמו להדגמת היסטוריית הזמנות ותשלומים של הלקוחה
  const clientOrders = [
    {
      id: "ORD-901",
      type: "פאה חדשה",
      date: "2026-06-15",
      status: "מוכנה",
      price: client.price || 18000,
      specs: 'מידה S | גלי | עבודת יד גבוהה | 55 ס"מ',
    },
    {
      id: "ORD-402",
      type: "תיקון וסירוק",
      date: "2026-02-10",
      status: "נמסרה",
      price: 450,
      specs: "חפיפה, פן וחיזוק רשת",
    },
  ];

  const handleSendWhatsApp = () => {
    const message = `היי ${client.name} היקרה 🌸\nשמחים להיות בקשר מ-Esti Wigs!`;
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <>
      {/* Overlay Background */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Slide-over Panel */}
      <div className="client-drawer">
        {/* Header */}
        <div className="drawer-header">
          {/* צד ימין: אוואטר + פרטי הלקוחה */}
          <div className="drawer-header-right">
            <div className="client-avatar">
              👩‍💼
            </div>
            <div className="client-details">
              <h2>{client.name}</h2>
              <p className="mono">
                {client.phone}{" "}
                {client.email && (
                  <>
                    •{" "}
                    <a
                      href={`mailto:${client.email}`}
                      className="drawer-email-link"
                      title={`שלחי מייל ל-${client.email}`}
                    >
                      {client.email}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* צד שמאל: כפתורי פעולה + כפתור סגירה X */}
          <div className="drawer-header-left">
            <div className="drawer-actions-bar">
              <button className="btn-primary" onClick={() => setIsWizardOpen(true)}>
                + הזמנה חדשה
              </button>
              <button className="btn-whatsapp" onClick={handleSendWhatsApp}>
                <svg className="whatsapp-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="currentColor">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
                וואטסאפ
              </button>
            </div>
            <button className="btn-close" onClick={onClose} title="סגירה" aria-label="סגירה">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="drawer-tabs">
          <button
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            📋 הזמנות ועבודות
          </button>
          <button
            className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            💳 תשלומים וחובות
          </button>
          <button
            className={`tab-btn ${activeTab === "specs" ? "active" : ""}`}
            onClick={() => setActiveTab("specs")}
          >
            📐 מידות ומפרט
          </button>
          <button
            className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            📄 מסמכים וחתימות
          </button>
        </div>

        {/* Tab Content */}
        <div className="drawer-body">
          {/* TAB 1: ORDERS */}
          {activeTab === "orders" && (
            <div className="tab-content">
              <h3>היסטוריית הזמנות ({clientOrders.length})</h3>
              <div className="orders-list">
                {clientOrders.map((ord) => (
                  <div key={ord.id} className="order-card">
                    <div className="order-card-header">
                      <span className="font-bold">{ord.type} ({ord.id})</span>
                      <span className="badge badge-paid">{ord.status}</span>
                    </div>
                    <p className="order-specs">{ord.specs}</p>
                    <div className="order-card-footer">
                      <span className="mono">תאריך: {ord.date}</span>
                      <span className="mono font-bold">₪{ord.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="tab-content">
              <h3>סיכום מאזן ותשלומים</h3>
              <div className="financial-summary-grid">
                <div className="fin-card">
                  <span>סה"כ עסקאות</span>
                  <span className="mono font-bold">₪{(client.price || 18000).toLocaleString()}</span>
                </div>
                <div className="fin-card">
                  <span>שולם בפועל</span>
                  <span className="mono font-bold text-success">₪{(client.paid || 18000).toLocaleString()}</span>
                </div>
                <div className="fin-card">
                  <span>יתרת חוב</span>
                  <span className="mono font-bold text-danger">
                    ₪{((client.price || 18000) - (client.paid || 18000)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEASUREMENTS & SPECS (עם אפשרות עריכה) */}
          {activeTab === "specs" && (
            <div className="tab-content">
              <div className="tab-title-row">
                <h3>מידות ראש ומפרט אישי</h3>
                {!isEditingSpecs ? (
                  <button className="btn-edit-specs" onClick={() => setIsEditingSpecs(true)}>
                    ✏️ עריכת מפרט
                  </button>
                ) : (
                  <button className="btn-save-specs" onClick={handleSaveSpecs}>
                    💾 שמירת שינויים
                  </button>
                )}
              </div>

              <div className="specs-grid">
                <div className="spec-box">
                  <label className="spec-label">מידות היקף / ראש:</label>
                  {!isEditingSpecs ? (
                    <p className="spec-value">{measurements}</p>
                  ) : (
                    <textarea
                      className="spec-input"
                      value={measurements}
                      onChange={(e) => setMeasurements(e.target.value)}
                      rows={3}
                    />
                  )}
                </div>

                <div className="spec-box">
                  <label className="spec-label">הערות ודגשים מיוחדים:</label>
                  {!isEditingSpecs ? (
                    <p className="spec-value">{notes}</p>
                  ) : (
                    <textarea
                      className="spec-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === "docs" && (
            <div className="tab-content">
              <h3>מסמכים, קבלות וטפסים חתומים</h3>
              <div className="docs-list">
                <div className="doc-item">
                  <span>📄 טופס הזמנה חתום - פאה חדשה.pdf</span>
                  <button className="btn-download">
                    הורדה 📥
                  </button>
                </div>
                <div className="doc-item">
                  <span>🧾 קבלה ואישור תשלום מקדמה.pdf</span>
                  <button className="btn-download">
                    הורדה 📥
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Order Wizard */}
      <NewOrderWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onOrderCreated={() => {}}
        preselectedClient={{ id: client.id, name: client.name, phone: client.phone }}
      />
    </>
  );
}