import React, { useState, useEffect } from "react";
import "./Calendar.css";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
  notes: string;
  ordersCount: number;
  totalSpent: number;
}

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  phone: string;
}

const INITIAL_CLIENTS: Client[] = [
  {
    id: "CL-101",
    firstName: "שרה",
    lastName: "לוי",
    phone: "050-1234567",
    email: "sarah.levy@gmail.com",
    createdAt: "2026-01-15",
    notes: "רגישה בקרקפת, מעדיפה לייס שקוף",
    ordersCount: 3,
    totalSpent: 18450,
  },
  {
    id: "CL-102",
    firstName: "מירי",
    lastName: "כהן",
    phone: "052-9876543",
    email: "miri.cohen@yahoo.com",
    createdAt: "2026-02-10",
    notes: "אוספת תמיד בימי שישי",
    ordersCount: 2,
    totalSpent: 15700,
  },
  {
    id: "CL-103",
    firstName: "רחלי",
    lastName: "פרידמן",
    phone: "054-1112233",
    email: "racheli.f@gmail.com",
    createdAt: "2026-05-04",
    notes: "לקוחה חדשה, הגיעה דרך המלצה",
    ordersCount: 1,
    totalSpent: 2200,
  },
];

// יצירת רשימה של 30 פגישות לתאריך 19/08/2026 לבדיקת העומס
const GENERATED_APPOINTMENTS: Appointment[] = Array.from({ length: 30 }, (_, index) => {
  const hour = Math.floor(index / 2) + 8;
  const minute = index % 2 === 0 ? "00" : "30";
  const endHour = minute === "30" ? hour + 1 : hour;
  const endMinute = minute === "30" ? "00" : "30";
  
  const startTime = `${String(hour).padStart(2, "0")}:${minute}`;
  const endTime = `${String(endHour).padStart(2, "0")}:${endMinute}`;
  
  const clientNames = ["שרה לוי", "מירי כהן", "רחלי פרידמן", "לאה שוורץ", "תמר אברהם", "חנה קליין"];
  const types = ["מדידת פאה חדשה", "תיקון רשת", "סירוק והחלקה", "מסירת פאה מוכנה"];
  
  return {
    id: `APT-AUTO-${index + 1}`,
    clientId: index % 2 === 0 ? "CL-101" : "CL-102",
    clientName: clientNames[index % clientNames.length],
    type: types[index % types.length],
    date: "2026-08-19",
    startTime,
    endTime,
    phone: index % 2 === 0 ? "050-1234567" : "052-9876543",
  };
});

export default function Calendar() {
  const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");
  const [appointments, setAppointments] = useState<Appointment[]>(GENERATED_APPOINTMENTS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 19));

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [isAddAptModalOpen, setIsAddAptModalOpen] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchText, setClientSearchText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [aptType, setAptType] = useState("מדידת פאה חדשה");
  const [aptDate, setAptDate] = useState("2026-08-19");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [clientError, setClientError] = useState("");

  const [selectedClientForPanel, setSelectedClientForPanel] = useState<Client | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const formatDateToIL = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysArray = () => {
    const days = [];
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const isoString = d.toISOString().split("T")[0];
      days.push({
        dayName: dayNames[d.getDay()],
        dateIso: isoString,
        dateFormatted: formatDateToIL(isoString),
      });
    }
    return days;
  };

  const daysList = getDaysArray();
  const currentDateIso = currentDate.toISOString().split("T")[0];

  const filteredClientsForSelect = clients.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.includes(clientSearchText) ||
      c.phone.includes(clientSearchText)
  );

  const handleOpenAddModal = () => {
    setEditingAptId(null);
    setSelectedClientId("");
    setClientSearchText("");
    setAptType("מדידת פאה חדשה");
    setAptDate(currentDateIso);
    setStartTime("10:00");
    setEndTime("11:00");
    setIsAddAptModalOpen(true);
  };

  const handleOpenEditModal = (apt: Appointment) => {
    setEditingAptId(apt.id);
    setSelectedClientId(apt.clientId);
    setClientSearchText(apt.clientName);
    setAptType(apt.type);
    setAptDate(apt.date);
    setStartTime(apt.startTime);
    setEndTime(apt.endTime);
    setIsAddAptModalOpen(true);
  };

  const handleDeleteAppointment = (aptId: string) => {
    if (window.confirm("האם את בטוחה שברצונך למחוק את הפגישה?")) {
      setAppointments(appointments.filter((a) => a.id !== aptId));
    }
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = clients.find((c) => c.id === selectedClientId);
    if (!targetClient) {
      alert("נא לבחור לקוחה מהרשימה");
      return;
    }

    if (editingAptId) {
      setAppointments(
        appointments.map((a) =>
          a.id === editingAptId
            ? {
                ...a,
                clientId: targetClient.id,
                clientName: `${targetClient.firstName} ${targetClient.lastName}`,
                type: aptType,
                date: aptDate,
                startTime,
                endTime,
                phone: targetClient.phone,
              }
            : a
        )
      );
    } else {
      const newApt: Appointment = {
        id: `APT-${Math.floor(100 + Math.random() * 900)}`,
        clientId: targetClient.id,
        clientName: `${targetClient.firstName} ${targetClient.lastName}`,
        type: aptType,
        date: aptDate,
        startTime,
        endTime,
        phone: targetClient.phone,
      };
      setAppointments([newApt, ...appointments]);
    }

    setIsAddAptModalOpen(false);
    setEditingAptId(null);
    setSelectedClientId("");
    setClientSearchText("");
  };

  const handleAddClientFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");

    const exists = clients.some((c) => c.phone.trim() === newPhone.trim());
    if (exists) {
      setClientError("⚠️ מספר טלפון זה כבר קיים במערכת!");
      return;
    }

    const newClient: Client = {
      id: `CL-${Math.floor(100 + Math.random() * 900)}`,
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      email: newEmail || "—",
      createdAt: new Date().toISOString().split("T")[0],
      notes: newNotes || "אין הערות",
      ordersCount: 0,
      totalSpent: 0,
    };

    setClients([newClient, ...clients]);
    setSelectedClientId(newClient.id);
    setClientSearchText(`${newClient.firstName} ${newClient.lastName}`);
    
    setIsNewClientModalOpen(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewEmail("");
    setNewNotes("");
  };

  const handleOpenClientPanel = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setSelectedClientForPanel(found);
    }
  };

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div>
          <h1>📅 יומן פגישות ולו"ז הסלון</h1>
          <p>ניהול תורים, מדידות ואיסופים לפי שעות</p>
        </div>
        <div className="calendar-actions">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === "weekly" ? "active" : ""}`}
              onClick={() => setViewMode("weekly")}
            >
              תצוגה שבועית
            </button>
            <button 
              className={`toggle-btn ${viewMode === "daily" ? "active" : ""}`}
              onClick={() => setViewMode("daily")}
            >
              תצוגה יומית ({appointments.filter(a => a.date === currentDateIso).length})
            </button>
          </div>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            + קביעת פגישה
          </button>
        </div>
      </div>

      {/* Main Calendar Container */}
      <div className="calendar-container">
        <div className="calendar-toolbar-sub">
          <div className="calendar-nav-controls">
            <button className="nav-arrow-btn" onClick={handlePrev} title="הקודם">&lt;</button>
            <h2>
              {viewMode === "weekly" 
                ? `שבוע מתאריך ${formatDateToIL(daysList[0]?.dateIso)}` 
                : `${currentDate.toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
              }
            </h2>
            <button className="nav-arrow-btn" onClick={handleNext} title="הבא">&gt;</button>
          </div>
        </div>

        {viewMode === "weekly" ? (
          <div className="weekly-days-grid">
            {daysList.map((dayObj, idx) => {
              const dayApts = appointments.filter((a) => a.date === dayObj.dateIso);
              return (
                <div key={idx} className="day-column">
                  <div className="day-column-header">
                    <span className="day-name">{dayObj.dayName}</span>
                    <span className="day-date mono">{dayObj.dateFormatted}</span>
                  </div>
                  <div className="day-column-body">
                    {dayApts.length === 0 ? (
                      <span className="no-apt">אין פגישות</span>
                    ) : (
                      dayApts.map((apt) => (
                        <div key={apt.id} className="appointment-card-mini">
                          {/* שורה עליונה: השעה משמאל ושלוש הנקודות מימין כמו שהיה */}
                          <div className="apt-card-top-row">
                            <span className="apt-time-badge mono" dir="ltr">{apt.startTime}-{apt.endTime}</span>
                            <div className="menu-container" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="dots-btn" 
                                onClick={() => setActiveMenuId(activeMenuId === apt.id ? null : apt.id)}
                              >
                                ⋮
                              </button>
                              {activeMenuId === apt.id && (
                                <div className="dropdown-menu">
                                  <button onClick={() => { setActiveMenuId(null); handleOpenEditModal(apt); }}>
                                    ✏️ עריכה
                                  </button>
                                  <button className="text-danger" onClick={() => { setActiveMenuId(null); handleDeleteAppointment(apt.id); }}>
                                    🗑️ מחיקה
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <h4 
                            className="apt-client-link" 
                            onClick={() => handleOpenClientPanel(apt.clientId)}
                            title="הצג פרטי לקוחה"
                          >
                            👤 {apt.clientName}
                          </h4>
                          <span className="apt-type-badge">📌 {apt.type}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="appointments-grid-daily">
            {appointments.filter((a) => a.date === currentDateIso).length === 0 ? (
              <div className="empty-state">אין פגישות לתאריך זה.</div>
            ) : (
              appointments
                .filter((a) => a.date === currentDateIso)
                .map((apt) => (
                  <div key={apt.id} className="appointment-card">
                    <div className="apt-time-box-daily mono" dir="ltr">
                      🕒 {apt.startTime} - {apt.endTime}
                    </div>
                    <div className="apt-details">
                      <div className="apt-client-row">
                        <h3 
                          className="apt-client-name link-action" 
                          onClick={() => handleOpenClientPanel(apt.clientId)}
                        >
                          👤 {apt.clientName}
                        </h3>
                        <span className="mono text-muted" dir="ltr">{apt.phone}</span>
                      </div>
                      <p className="apt-type">📌 מטרת הגעה: {apt.type}</p>
                    </div>

                    <div className="menu-container" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                      <button 
                        className="dots-btn" 
                        onClick={() => setActiveMenuId(activeMenuId === apt.id ? null : apt.id)}
                      >
                        ⋮
                      </button>
                      {activeMenuId === apt.id && (
                        <div className="dropdown-menu">
                          <button onClick={() => { setActiveMenuId(null); handleOpenEditModal(apt); }}>
                            ✏️ עריכה
                          </button>
                          <button className="text-danger" onClick={() => { setActiveMenuId(null); handleDeleteAppointment(apt.id); }}>
                            🗑️ מחיקה
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Modal - קביעת / עריכת פגישה */}
      {isAddAptModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#3b2a54' }}>
                {editingAptId ? "עריכת פגישה קיימת" : "קביעת פגישה חדשה"}
              </h2>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setIsNewClientModalOpen(true)}
              >
                + הוספת לקוחה חדשה
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="apt-form">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>שם הלקוחה *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="הקלד לחיפוש לקוחה..." 
                  value={clientSearchText}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setClientSearchText(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                />
                {isDropdownOpen && (
                  <div className="clients-dropdown-list">
                    {filteredClientsForSelect.length === 0 ? (
                      <div className="dropdown-item text-muted">לא נמצאו לקוחות</div>
                    ) : (
                      filteredClientsForSelect.map((c) => (
                        <div 
                          key={c.id} 
                          className="dropdown-item"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearchText(`${c.firstName} ${c.lastName}`);
                            setIsDropdownOpen(false);
                          }}
                        >
                          {c.firstName} {c.lastName} ({c.phone})
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>סיבת ההגעה / מטרת הפגישה *</label>
                  <select value={aptType} onChange={(e) => setAptType(e.target.value)}>
                    <option value="מדידת פאה חדשה">מדידת פאה חדשה</option>
                    <option value="תיקון רשת">תיקון רשת</option>
                    <option value="סירוק והחלקה">סירוק והחלקה</option>
                    <option value="מסירת פאה מוכנה">מסירת פאה מוכנה</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>תאריך הפגישה *</label>
                  <input 
                    type="date" 
                    required 
                    value={aptDate} 
                    onChange={(e) => setAptDate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>משעה *</label>
                  <input 
                    type="time" 
                    required 
                    dir="ltr"
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>עד שעה *</label>
                  <input 
                    type="time" 
                    required 
                    dir="ltr"
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '15px' }}>
                <button type="submit" className="btn-primary">שמור שינויים</button>
                <button type="button" className="btn-secondary" onClick={() => setIsAddAptModalOpen(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* פופאפ הוספת לקוחה חדשה */}
      {isNewClientModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setIsNewClientModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>הוספת לקוחה חדשה</h2>
              <button className="close-btn" onClick={() => setIsNewClientModalOpen(false)}>✕</button>
            </div>

            {clientError && <div className="error-banner">{clientError}</div>}

            <form onSubmit={handleAddClientFromModal} className="client-form">
              <div className="form-row">
                <div className="form-group">
                  <label>שם פרטי *</label>
                  <input 
                    type="text" 
                    required 
                    value={newFirstName} 
                    onChange={(e) => setNewFirstName(e.target.value)} 
                    placeholder="למשל: תמר"
                  />
                </div>
                <div className="form-group">
                  <label>שם משפחה *</label>
                  <input 
                    type="text" 
                    required 
                    value={newLastName} 
                    onChange={(e) => setNewLastName(e.target.value)} 
                    placeholder="למשל: כהן"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>מספר טלפון *</label>
                  <input 
                    type="tel" 
                    required 
                    dir="ltr" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                    placeholder="050-0000000"
                  />
                </div>
                <div className="form-group">
                  <label>כתובת אימייל</label>
                  <input 
                    type="email" 
                    dir="ltr" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>הערות אישיות</label>
                <textarea 
                  value={newNotes} 
                  onChange={(e) => setNewNotes(e.target.value)} 
                  placeholder="הערות על הלקוחה..."
                  style={{ minHeight: '60px', padding: '8px', border: '1px solid #e5dbf0', borderRadius: '8px' }}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">שמור והשתמש בלקוחה</button>
                <button type="button" className="btn-secondary" onClick={() => setIsNewClientModalOpen(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* פאנל צדדי לפרטי לקוחה */}
      {selectedClientForPanel && (
        <div className="modal-backdrop" onClick={() => setSelectedClientForPanel(null)}>
          <div className="side-panel" onClick={(e) => e.stopPropagation()}>
            <div className="side-panel-header">
              <h2>תיק לקוחה: {selectedClientForPanel.firstName} {selectedClientForPanel.lastName}</h2>
              <button className="close-btn" onClick={() => setSelectedClientForPanel(null)}>✕</button>
            </div>

            <div className="side-panel-body">
              <div className="client-info-box">
                <p><strong>טלפון:</strong> <span dir="ltr">{selectedClientForPanel.phone}</span></p>
                <p><strong>אימייל:</strong> <span dir="ltr">{selectedClientForPanel.email}</span></p>
                <p><strong>לקוחה החל מ-</strong> {formatDateToIL(selectedClientForPanel.createdAt)}</p>
                <p><strong>הערות:</strong> {selectedClientForPanel.notes}</p>
              </div>

              <h3>היסטוריית הזמנות ותשלומים</h3>
              <div className="client-history-placeholder">
                <p className="text-muted">ללקוחה זו קיימות {selectedClientForPanel.ordersCount} הזמנות במאגר בסך מצטבר של ₪{selectedClientForPanel.totalSpent.toLocaleString()}.</p>
              </div>
            </div>

            <div className="side-panel-footer">
              <button className="btn-secondary" onClick={() => setSelectedClientForPanel(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}