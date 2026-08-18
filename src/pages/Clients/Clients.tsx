import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";
import ClientDrawer from "../../components/clients/ClientDrawer";
import AddClientModal from "../../components/modals/AddClientModal";
import "./Clients.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  measurements: string;
  sales: string;
  notes: string;
  wigStatus: string;
  paymentStatus: string;
  price: number;
  paid: number;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const wigStatusClass = (status: string): string => {
  switch (status) {
    case "מוכנה":
      return "badge badge--green";
    case "בטיפול":
      return "badge badge--orange";
    case "חדשה":
      return "badge badge--blue";
    default:
      return "badge badge--gray";
  }
};

const paymentStatusClass = (status: string): string => {
  switch (status) {
    case "שולם":
      return "badge badge--green";
    case "מקדמה":
      return "badge badge--orange";
    case "לא שולם":
      return "badge badge--red";
    default:
      return "badge badge--gray";
  }
};

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

  // Fetch clients from Firestore
  const fetchClients = async () => {
    try {
      const snapshot = await getDocs(collection(db, "clients"));
      const data: Client[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Client, "id">),
      }));
      setClients(data);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("שגיאה בטעינת הנתונים. בדקי את החיבור ל-Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Delete a client
  const handleDelete = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(
      `האם את בטוחה שברצונך למחוק את ${clientName}?`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "clients", clientId));
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setIsDrawerOpen(false);
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("שגיאה במחיקת הלקוחה. נסי שוב.");
    }
  };

  // Row click handler - פותח את כרטיס הלקוחה הנשלף
  const handleRowClick = (client: Client) => {
    setSelectedClient(client);
    setIsDrawerOpen(true);
  };

  // Filtered list
  const filtered = clients.filter((c) => {
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
          onClick={() => setIsModalOpen(true)}
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
                <th>מידות</th>
                <th>מכירות</th>
                <th>סטטוס פאה</th>
                <th>סטטוס תשלום</th>
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

                  <td>{client.measurements || "—"}</td>

                  <td>
                    <div className="clients-table__sales">
                      <span>{client.sales || "—"}</span>
                      {client.price != null && (
                        <span className="clients-table__price">
                          ₪{client.price.toLocaleString("he-IL")}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    {client.wigStatus ? (
                      <span className={wigStatusClass(client.wigStatus)}>
                        {client.wigStatus}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {client.paymentStatus ? (
                      <span className={paymentStatusClass(client.paymentStatus)}>
                        {client.paymentStatus}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="clients-table__notes">
                    {client.notes || "—"}
                  </td>

                  <td>
                    <button
                      className="btn-icon btn-icon--danger"
                      title={`מחקי את ${client.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client.id, client.name);
                      }}
                      aria-label={`מחקי את ${client.name}`}
                    >
                      🗑️
                    </button>
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

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientAdded={fetchClients}
      />
    </div>
  );
};

export default Clients;