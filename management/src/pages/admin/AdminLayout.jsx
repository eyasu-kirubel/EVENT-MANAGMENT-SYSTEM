import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BsBarChart,
  BsChevronLeft,
  BsChevronRight,
  BsCollection,
  BsGrid1X2,
  BsPeople,
  BsBoxArrowRight,
  BsTicketPerforated,
  BsClockHistory,
} from "react-icons/bs";

const links = [
  { to: "/admin", label: "Dashboard", icon: BsGrid1X2, end: true },
  { to: "/admin/pending", label: "Pending Events", icon: BsClockHistory },
  { to: "/admin/users", label: "Manage Users", icon: BsPeople },
  { to: "/admin/tickets", label: "Tickets by Event", icon: BsTicketPerforated },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`dashboard-shell admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><BsGrid1X2 /></div>
          <div className="sidebar-brand-copy">
            <strong>EventManager</strong>
            <span>Admin panel</span>
          </div>
        </div>
        <nav className="dashboard-nav" aria-label="Admin navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-nav-link ${isActive ? "active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user?.fullname || "A").charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{user?.fullname || "Administrator"}</strong>
            <span>Administrator</span>
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
          <div>
            <span className="dashboard-eyebrow">Administration</span>
            <h1>Platform overview</h1>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
