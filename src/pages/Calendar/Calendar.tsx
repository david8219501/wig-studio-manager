import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { Plus } from "lucide-react";
import { db, auth } from "../../services/firebase";
import { formatDateIL } from "../../utils/formatDate";
import { DEFAULT_APPOINTMENT_TYPES } from "../../utils/businessSettings";
import DateInput from "../../components/common/DateInput";
import TimeInput from "../../components/common/TimeInput";
import CustomSelect from "../../components/common/CustomSelect";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import "./Calendar.css";

// ערך-סמן לבחירת "אחר / הוסף חדש" ב-CustomSelect של מטרת הפגישה - לא
// נשמר בפועל כ-type של הפגישה, רק פותח שדה טקסט חופשי (ראו customAptType).
const OTHER_APPOINTMENT_TYPE = "__other__";

// טיפוס הלקוחה תואם בדיוק למבנה האמיתי ב-collection "clients" (ראו Clients.tsx)
interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
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

export default function Calendar() {
  const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [isAddAptModalOpen, setIsAddAptModalOpen] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchText, setClientSearchText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [aptType, setAptType] = useState("מדידת פאה חדשה");
  const [customAptType, setCustomAptType] = useState("");
  const [aptDate, setAptDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [formError, setFormError] = useState<string | null>(null);
  const [overlapConfirmOpen, setOverlapConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // רשימת מטרות פגישה של העסק - נטענת מ-businessSettings/{uid}
  // (אותו מסמך תמחור/קטגוריות), עם אתחול לברירת המחדל הקיימת אם השדה
  // עדיין לא קיים בפועל.
  const [appointmentTypeList, setAppointmentTypeList] = useState<string[]>(DEFAULT_APPOINTMENT_TYPES);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    const settingsRef = doc(db, "businessSettings", businessId);
    getDoc(settingsRef)
      .then((snap) => {
        const data = snap.data() as { appointmentTypes?: string[] } | undefined;
        if (data?.appointmentTypes && data.appointmentTypes.length > 0) {
          setAppointmentTypeList(data.appointmentTypes);
        } else {
          setDoc(settingsRef, { appointmentTypes: DEFAULT_APPOINTMENT_TYPES }, { merge: true }).catch((err) =>
            console.error("Error seeding appointment types:", err)
          );
        }
      })
      .catch((err) => console.error("Error loading appointment types:", err));
  }, []);

  const APPOINTMENT_TYPE_OPTIONS = useMemo(
    () => [
      ...appointmentTypeList.map((t) => ({ value: t, label: t })),
      { value: OTHER_APPOINTMENT_TYPE, label: "אחר / הוסף חדש" },
    ],
    [appointmentTypeList]
  );

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

  // האזנה חיה ל-Firestore: פגישות ולקוחות, מסוננות רק לעסק המחובר (businessId = uid)
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const aptQuery = query(collection(db, "appointments"), where("businessId", "==", businessId));
    const unsubApt = onSnapshot(
      aptQuery,
      (snapshot) => {
        setAppointments(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, "id">) }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading appointments:", err);
        setLoadError("שגיאה בטעינת הפגישות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    const clientsQuery = query(collection(db, "clients"), where("businessId", "==", businessId));
    const unsubClients = onSnapshot(
      clientsQuery,
      (snapshot) => {
        setClients(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Client, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading clients:", err);
        setLoadError("שגיאה בטעינת רשימת הלקוחות. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => {
      unsubApt();
      unsubClients();
    };
  }, []);

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
        dateFormatted: formatDateIL(isoString),
      });
    }
    return days;
  };

  const daysList = getDaysArray();
  const currentDateIso = currentDate.toISOString().split("T")[0];

  const filteredClientsForSelect = clients.filter(
    (c) => c.name.includes(clientSearchText) || c.phone.includes(clientSearchText)
  );

  // חפיפת שעות מול פגישה אחרת קיימת באותו יום - אזהרה בלבד, לא חסימה
  // (ראו handleSaveAppointment). חפיפה קלאסית: a.startTime < endTime &&
  // startTime < a.endTime - עובד ישירות על מחרוזות "HH:MM" כי השוואת
  // מחרוזות בפורמט הזה תואמת להשוואה כרונולוגית.
  const hasTimeOverlap = useMemo(() => {
    if (!aptDate || !startTime || !endTime) return false;
    return appointments.some(
      (a) => a.date === aptDate && a.id !== editingAptId && a.startTime < endTime && startTime < a.endTime
    );
  }, [appointments, aptDate, startTime, endTime, editingAptId]);

  const handleOpenAddModal = () => {
    setEditingAptId(null);
    setSelectedClientId("");
    setClientSearchText("");
    setAptType("מדידת פאה חדשה");
    setCustomAptType("");
    setAptDate(currentDateIso);
    setStartTime("10:00");
    setEndTime("11:00");
    setFormError(null);
    setIsAddAptModalOpen(true);
  };

  // נפתחת מכפתור ה-"+" על תא יום ספציפי בתצוגת השבוע - אותה טופס
  // הוספה, רק עם שדה התאריך ממולא מראש ליום שנלחץ.
  const handleOpenAddModalForDate = (dateIso: string) => {
    setEditingAptId(null);
    setSelectedClientId("");
    setClientSearchText("");
    setAptType("מדידת פאה חדשה");
    setCustomAptType("");
    setAptDate(dateIso);
    setStartTime("10:00");
    setEndTime("11:00");
    setFormError(null);
    setIsAddAptModalOpen(true);
  };

  const handleOpenEditModal = (apt: Appointment) => {
    setEditingAptId(apt.id);
    setSelectedClientId(apt.clientId);
    setClientSearchText(apt.clientName);
    // מטרה שכבר לא ברשימת האפשרויות הקבועות (הוזנה בעבר כ"אחר / הוסף
    // חדש") - ממלאים מראש את שדה הטקסט החופשי, לא רק בוחרים "אחר" ריק.
    const isKnownType = APPOINTMENT_TYPE_OPTIONS.some((o) => o.value === apt.type);
    setAptType(isKnownType ? apt.type : OTHER_APPOINTMENT_TYPE);
    setCustomAptType(isKnownType ? "" : apt.type);
    setAptDate(apt.date);
    setStartTime(apt.startTime);
    setEndTime(apt.endTime);
    setFormError(null);
    setIsAddAptModalOpen(true);
  };

  const handleDeleteAppointment = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "appointments", deleteConfirmId));
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert("שגיאה במחיקת הפגישה. נסי שוב.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ביצוע השמירה בפועל ב-Firestore - מופרד מ-handleSaveAppointment כדי
  // שאפשר יהיה לקרוא לו גם ישירות (אין חפיפה) וגם אחרי אישור מפורש
  // ב-ConfirmDialog (יש חפיפה, אבל המשתמשת בחרה להמשיך בכל זאת).
  const performSaveAppointment = async () => {
    const targetClient = clients.find((c) => c.id === selectedClientId);
    if (!targetClient) return;

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const finalType = aptType === OTHER_APPOINTMENT_TYPE ? customAptType.trim() : aptType;

    // סוגרים את אישור החפיפה מיד (אם היה פתוח) - לא תלוי בהצלחת השמירה,
    // כדי שלא יישאר פתוח מעל הודעת שגיאה אם השמירה עצמה נכשלת.
    setOverlapConfirmOpen(false);
    setSaving(true);
    try {
      if (editingAptId) {
        await updateDoc(doc(db, "appointments", editingAptId), {
          clientId: targetClient.id,
          clientName: targetClient.name,
          type: finalType,
          date: aptDate,
          startTime,
          endTime,
          phone: targetClient.phone,
        });
      } else {
        await addDoc(collection(db, "appointments"), {
          businessId,
          clientId: targetClient.id,
          clientName: targetClient.name,
          type: finalType,
          date: aptDate,
          startTime,
          endTime,
          phone: targetClient.phone,
        });
      }

      setIsAddAptModalOpen(false);
      setEditingAptId(null);
      setSelectedClientId("");
      setClientSearchText("");
    } catch (err) {
      console.error("Error saving appointment:", err);
      alert("שגיאה בשמירת הפגישה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clients.find((c) => c.id === selectedClientId)) {
      alert("נא לבחור לקוחה מהרשימה");
      return;
    }
    if (aptType === OTHER_APPOINTMENT_TYPE && !customAptType.trim()) {
      setFormError("יש להזין מטרת פגישה מותאמת אישית.");
      return;
    }
    if (endTime <= startTime) {
      setFormError('שעת "עד" חייבת להיות מאוחרת משעת "משעה".');
      return;
    }

    // חפיפה - אזהרה בלבד, לא חסימה: מציגים אישור מפורש, ורק אם המשתמשת
    // בוחרת להמשיך בכל זאת קוראים בפועל ל-performSaveAppointment.
    if (hasTimeOverlap) {
      setOverlapConfirmOpen(true);
      return;
    }

    performSaveAppointment();
  };

  const handleAddClientFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    setSaving(true);
    try {
      // בדיקת כפילות טלפון מול לקוחות קיימות של אותו עסק
      const dupQuery = query(
        collection(db, "clients"),
        where("businessId", "==", businessId),
        where("phone", "==", newPhone.trim())
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        setClientError("⚠️ מספר טלפון זה כבר קיים במערכת!");
        setSaving(false);
        return;
      }

      const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim();
      const docRef = await addDoc(collection(db, "clients"), {
        businessId,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        name: fullName,
        phone: newPhone.trim(),
        email: newEmail.trim(),
        notes: newNotes.trim(),
        createdAt: new Date().toISOString(),
      });

      setSelectedClientId(docRef.id);
      setClientSearchText(fullName);

      setIsNewClientModalOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      setNewEmail("");
      setNewNotes("");
    } catch (err) {
      console.error("Error adding client:", err);
      setClientError("שגיאה בשמירת הלקוחה. נסי שוב.");
    } finally {
      setSaving(false);
    }
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

      {loading && (
        <div className="calendar-state">
          <div className="calendar-state__spinner" />
          <p>טוענת יומן...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="calendar-state calendar-state--error">
          <span className="calendar-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {/* Main Calendar Container */}
      {!loading && !loadError && (
      <div className="calendar-container">
        <div className="calendar-toolbar-sub">
          <div className="calendar-nav-controls">
            <button className="nav-arrow-btn" onClick={handlePrev} title="הקודם">&lt;</button>
            <h2>
              {viewMode === "weekly" 
                ? `שבוע מתאריך ${daysList[0] ? formatDateIL(daysList[0].dateIso) : ""}`
                : formatDateIL(currentDate, { weekday: "long", month: "long" })
              }
            </h2>
            <button className="nav-arrow-btn" onClick={handleNext} title="הבא">&gt;</button>
          </div>
        </div>

        {viewMode === "weekly" ? (
          <div className="weekly-days-grid">
            {daysList.map((dayObj, idx) => {
              const dayApts = appointments
                .filter((a) => a.date === dayObj.dateIso)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
                                  <button className="text-danger" onClick={() => { setActiveMenuId(null); setDeleteConfirmId(apt.id); }}>
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
                    <button
                      type="button"
                      className="day-add-appointment-btn"
                      onClick={() => handleOpenAddModalForDate(dayObj.dateIso)}
                    >
                      <Plus size={14} /> הוסף פגישה
                    </button>
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
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
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
                          <button className="text-danger" onClick={() => { setActiveMenuId(null); setDeleteConfirmId(apt.id); }}>
                            🗑️ מחיקה
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
            <button
              type="button"
              className="day-add-appointment-btn"
              onClick={() => handleOpenAddModalForDate(currentDateIso)}
            >
              <Plus size={14} /> הוסף פגישה
            </button>
          </div>
        )}
      </div>
      )}

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
                            setClientSearchText(c.name);
                            setIsDropdownOpen(false);
                          }}
                        >
                          {c.name} (<span dir="ltr">{c.phone}</span>)
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>מטרת הפגישה *</label>
                  <CustomSelect value={aptType} onChange={setAptType} options={APPOINTMENT_TYPE_OPTIONS} />
                </div>
                <div className="form-group">
                  <label>תאריך הפגישה *</label>
                  <DateInput required value={aptDate} onChange={setAptDate} />
                </div>
              </div>

              {aptType === OTHER_APPOINTMENT_TYPE && (
                <div className="form-group">
                  <label>מטרה מותאמת אישית *</label>
                  <input
                    type="text"
                    required
                    placeholder="הקלידי מטרת פגישה..."
                    value={customAptType}
                    onChange={(e) => setCustomAptType(e.target.value)}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>משעה *</label>
                  <TimeInput required value={startTime} onChange={setStartTime} />
                </div>
                <div className="form-group">
                  <label>עד שעה *</label>
                  <TimeInput required value={endTime} onChange={setEndTime} />
                </div>
              </div>

              {hasTimeOverlap && (
                <div className="field-warning">⚠️ יש כבר פגישה בשעה זו באותו יום.</div>
              )}
              {formError && <div className="error-banner">{formError}</div>}

              <div className="modal-actions" style={{ marginTop: '15px' }}>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "שומר..." : "שמור שינויים"}</button>
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
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "שומר..." : "שמור והשתמש בלקוחה"}</button>
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
              <h2>תיק לקוחה: {selectedClientForPanel.name}</h2>
              <button className="close-btn" onClick={() => setSelectedClientForPanel(null)}>✕</button>
            </div>

            <div className="side-panel-body">
              <div className="client-info-box">
                <p><strong>טלפון:</strong> <span dir="ltr">{selectedClientForPanel.phone}</span></p>
                <p><strong>אימייל:</strong> <span dir="ltr">{selectedClientForPanel.email || "—"}</span></p>
                <p><strong>הערות:</strong> {selectedClientForPanel.notes || "אין הערות"}</p>
              </div>

              <h3>היסטוריית הזמנות ותשלומים</h3>
              <div className="client-history-placeholder">
                <p className="text-muted">היסטוריית ההזמנות של הלקוחה מוצגת בכרטיס הלקוחה המלא, בדף הלקוחות.</p>
              </div>
            </div>

            <div className="side-panel-footer">
              <button className="btn-secondary" onClick={() => setSelectedClientForPanel(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="מחיקת פגישה"
        message="האם את בטוחה שברצונך למחוק את הפגישה?"
        variant="danger"
        onConfirm={handleDeleteAppointment}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmDialog
        isOpen={overlapConfirmOpen}
        title="חפיפת שעות"
        message="יש כבר פגישה בשעה זו באותו יום. לשמור בכל זאת?"
        variant="warning"
        confirmLabel="שמירה בכל זאת"
        onConfirm={performSaveAppointment}
        onCancel={() => setOverlapConfirmOpen(false)}
      />
    </div>
  );
}