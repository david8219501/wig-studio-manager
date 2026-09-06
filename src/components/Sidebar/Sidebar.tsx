import "./Sidebar.css";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  businessName?: string;
  userInitials?: string;
  logoUrl?: string | null;
}

const NAV_ITEMS = [
  { label: "לוח בקרה", icon: "🏠", id: "dashboard" },
  { label: "ניהול לקוחות", icon: "👥", id: "clients" },
  { label: "יומן פגישות", icon: "📅", id: "calendar" },
  { label: "ניהול מלאי", icon: "📦", id: "inventory" },
  { label: "מחשבונים", icon: "🧮", id: "calculators" },
  { label: "מכירות", icon: "🛒", id: "sales" },
  { label: "ניהול הוצאות", icon: "🧾", id: "expenses" },
  { label: "דוחות", icon: "📊", id: "reports" },
];

export default function Sidebar({ activePage, onNavigate, businessName, userInitials, logoUrl }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="לוגו העסק" className="sidebar-avatar sidebar-avatar-logo" />
        ) : (
          <div className="sidebar-avatar">{userInitials || "אס"}</div>
        )}
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">{businessName || "מערכת ניהול"}</div>
          <div className="sidebar-logo-sub">סלון פאות</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-nav-bottom">
        <button
          onClick={() => onNavigate("settings")}
          className={`nav-item ${activePage === "settings" ? "active" : ""}`}
        >
          <span className="nav-icon">⚙️</span>
          <span>הגדרות</span>
        </button>
      </div>
    </aside>
  );
}