import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BsCalendar3,
  BsChevronLeft,
  BsChevronRight,
  BsHeart,
  BsGear,
  BsBoxArrowRight,
  BsTicketPerforated,
} from "react-icons/bs";

const links = [
  { to: "/events", label: "Discover Events", icon: BsCalendar3, end: true },
  { to: "/events?tab=my-events", label: "My Events", icon: BsTicketPerforated },
  { to: "/events?tab=favorites", label: "Favorites", icon: BsHeart },
  { to: "/events?tab=settings", label: "Settings", icon: BsGear },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`dashboard-shell customer-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><BsCalendar3 /></div>
          <div className="sidebar-brand-copy">
            <strong>EventManager</strong>
            <span>Customer</span>
          </div>
        </div>
        <nav className="dashboard-nav" aria-label="Customer navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={label} to={to} end={end} className={({ isActive }) => `dashboard-nav-link ${isActive ? "active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user?.fullname || "C").charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{user?.fullname || "Customer"}</strong>
            <span>Customer</span>
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
            <span className="dashboard-eyebrow">Customer workspace</span>
            <h1>Find your next event</h1>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
