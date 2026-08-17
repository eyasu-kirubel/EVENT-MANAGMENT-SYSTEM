import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BsArrowLeft,
  BsBarChart,
  BsCalendar3,
  BsChevronLeft,
  BsChevronRight,
  BsCollection,
  BsGear,
  BsGrid1X2,
  BsQrCodeScan,
  BsPlusCircle,
  BsTags,
  BsBoxArrowRight,
} from "react-icons/bs";

const links = [
  { to: "/organizer", label: "Dashboard", icon: BsGrid1X2, end: true },
  { to: "/organizer/browse", label: "Browse Events", icon: BsCalendar3 },
  { to: "/organizer/create", label: "Create Event", icon: BsPlusCircle },
  { to: "/organizer/events", label: "Manage Events", icon: BsCollection },
  { to: "/organizer/categories", label: "Categories", icon: BsTags },
  { to: "/organizer/scanner", label: "QR Scanner", icon: BsQrCodeScan },
  { to: "/organizer/analytics", label: "Analytics", icon: BsBarChart },
  { to: "/organizer/settings", label: "Settings", icon: BsGear },
];

export default function OrganizerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`dashboard-shell organizer-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><BsCalendar3 /></div>
          <div className="sidebar-brand-copy">
            <strong>EventManager</strong>
            <span>Organizer</span>
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Organizer navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-nav-link ${isActive ? "active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user?.fullname || "O").charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{user?.fullname || "Organizer"}</strong>
            <span>Organizer</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Log out" aria-label="Log out">
            <BsBoxArrowRight />
          </button>
        </div>
      </aside>

      <button className="sidebar-toggle" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">
        {collapsed ? <BsChevronRight /> : <BsChevronLeft />}
      </button>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <button className="mobile-back" onClick={() => navigate(-1)} title="Back">
            <BsArrowLeft />
          </button>
          <div>
            <span className="dashboard-eyebrow">Organizer workspace</span>
            <h1>Manage your events</h1>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
