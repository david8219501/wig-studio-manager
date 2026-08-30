import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import ClientDrawer from "../../components/clients/ClientDrawer";
import AddClientModal from "../../components/modals/AddClientModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import "./Clients.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  firstName?: string; // נכתב תמיד ע"י AddClientModal/Calendar.tsx בפועל - משמש למיון אלפביתי (ראו sortedClients)
  phone: string;
  email: string;
  notes: string;
  measurements?: string; // מידות ראש - נערך דרך טאב "מידות ומפרט" בכרטיס הלקוחה
}

// ─── Component ────────────────────────────────────────────────────────────────

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State עבור פאנל הלקוחה הנשלף (Drawer)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State עבור אישור מחיקה (ConfirmDialog במקום window.confirm)
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);

  // האזנה חיה ל-Firestore, מסוננת רק ללקוחות של העסק המחובר (businessId = uid)
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) {
      setLoading(false);
      return;
    }

    const clientsQuery = query(collection(db, "clients"), where("businessId", "==", businessId));
    const unsubscribe = onSnapshot(
      clientsQuery,
      (snapshot) => {
        const data: Client[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Client, "id">),
        }));
        setClients(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching clients:", err);
        setError("שגיאה בטעינת הנתונים. בדקי את החיבור ל-Firestore.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // מחיקת לקוחה בפועל - נקראת רק אחרי אישור ב-ConfirmDialog (ראו handleDelete)
  const performDelete = async () => {
    if (!deleteConfirmClient) return;
    const clientId = deleteConfirmClient.id;
    try {
      await deleteDoc(doc(db, "clients", clientId));
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setIsDrawerOpen(false);
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("שגיאה במחיקת הלקוחה. נסי שוב.");
    } finally {
      setDeleteConfirmClient(null);
    }
  };

  const handleDelete = (client: Client) => {
    setDeleteConfirmClient(client);
  };

  // Edit client handler
  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  // Row click handler - פותח את כרטיס הלקוחה הנשלף
  const handleRowClick = (client: Client) => {
    setSelectedClient(client);
    setIsDrawerOpen(true);
  };

  // מיון אלפביתי לפי שם פרטי - ברירת מחדל, במקום סדר טעינה/יצירה. firstName
  // נכתב תמיד בפועל (AddClientModal.tsx/Calendar.tsx), אבל fallback לפירוק
  // name ליתר ביטחון על רשומות ישנות/חריגות בלי השדה.
  const sortedClients = useMemo(
    () =>
      [...clients].sort((a, b) =>
        (a.firstName || a.name?.split(" ")[0] || "").localeCompare(b.firstName || b.name?.split(" ")[0] || "", "he")
      ),
    [clients]
  );

  // Filtered list
  const filtered = sortedClients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="clients-page">
      {/* Page header */}
      <div className="clients-page__header">
        <h1 className="clients-page__title">רשימת לקוחות</h1>
        <span className="clients-page__count">{clients.length} לקוחות</span>
      </div>

      {/* Search + actions bar */}
      <div className="clients-page__toolbar">
        <div className="clients-search">
          <span className="clients-search__icon">🔍</span>
          <input
            className="clients-search__input"
            type="text"
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="rtl"
          />
        </div>

        <button
          className="btn btn--primary"
          onClick={() => {
            setSelectedClient(null);
            setIsModalOpen(true);
          }}
        >
          + הוספי לקוחה חדשה
        </button>
      </div>

      {/* States: loading / error / empty */}
      {loading && (
        <div className="clients-state">
          <div className="clients-state__spinner" />
          <p>טוענת נתונים...</p>
        </div>
      )}

      {!loading && error && (
        <div className="clients-state clients-state--error">
          <span className="clients-state__icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="clients-state">
          <span className="clients-state__icon">🔍</span>
          <p>{search ? "לא נמצאו תוצאות לחיפוש זה." : "עדיין אין לקוחות במערכת."}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="clients-table-wrapper">
          <table className="clients-table" dir="rtl">
            <thead>
              <tr>
                <th>שם לקוחה</th>
                <th>טלפון</th>
                <th>אימייל</th>
                <th>הערות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="clients-table__row"
                  onClick={() => handleRowClick(client)}
                >
                  <td className="clients-table__name">{client.name || "—"}</td>

                  <td dir="ltr" className="clients-table__phone">
                    {client.phone || "—"}
                  </td>

                  <td dir="ltr" className="clients-table__email">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="clients-table__email-link"
                      >
                        {client.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="clients-table__notes">
                    {client.notes || "—"}
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn-icon"
                        title={`ערוך את ${client.name}`}
                        onClick={(e) => handleEdit(client, e)}
                        aria-label={`ערוך את ${client.name}`}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title={`מחקי את ${client.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client);
                        }}
                        aria-label={`מחקי את ${client.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Client Profile Drawer */}
      <ClientDrawer
        client={selectedClient}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Add/Edit Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
        }}
        onClientAdded={() => {}}
        editingClient={selectedClient}
      />

      <ConfirmDialog
        isOpen={deleteConfirmClient !== null}
        title="מחיקת לקוחה"
        message={`האם את בטוחה שברצונך למחוק את ${deleteConfirmClient?.name}?`}
        variant="danger"
        onConfirm={performDelete}
        onCancel={() => setDeleteConfirmClient(null)}
      />
    </div>
  );
};

export default Clients;