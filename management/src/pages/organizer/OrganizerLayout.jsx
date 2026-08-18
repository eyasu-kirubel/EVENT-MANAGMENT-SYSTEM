import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  BsHeart,
  BsQrCodeScan,
  BsPlusCircle,
  BsTags,
  BsTicketPerforated,
  BsBoxArrowRight,
} from "react-icons/bs";

const organizerLinks = [
  { to: "/organizer", label: "Dashboard", icon: BsGrid1X2, end: true },
  { to: "/organizer/events", label: "Manage Events", icon: BsCollection },
  { to: "/organizer/create", label: "Create Event", icon: BsPlusCircle },
  { to: "/organizer/categories", label: "Categories", icon: BsTags },
  { to: "/organizer/scanner", label: "QR Scanner", icon: BsQrCodeScan },
  { to: "/organizer/analytics", label: "Analytics", icon: BsBarChart },
  { to: "/organizer/organizer-settings", label: "Settings", icon: BsGear },
];

const customerLinks = [
  { to: "/organizer/browse", label: "Events", icon: BsCalendar3 },
  { to: "/organizer/my-bookings", label: "My Bookings", icon: BsTicketPerforated },
  { to: "/organizer/favorites", label: "Favorites", icon: BsHeart },
  { to: "/organizer/customer-settings", label: "Settings", icon: BsGear },
];

function SidebarNavLink({ to, label, icon: Icon, end }) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === to
    : location.pathname.startsWith(to) || (to === "/organizer/browse" && location.pathname === "/organizer/browse");
  return (
    <NavLink to={to} end={end} className={`dashboard-nav-link ${isActive ? "active" : ""}`}>
      <Icon />
      <span>{label}</span>
    </NavLink>
  );
}

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
          {organizerLinks.map(({ to, label, icon: Icon, end }) => (
            <SidebarNavLink key={to} to={to} label={label} icon={Icon} end={end} />
          ))}
        </nav>

        <div className="sidebar-section-divider" />

        <nav className="dashboard-nav" aria-label="Customer navigation">
          <span className="sidebar-section-label">Customer</span>
          {customerLinks.map(({ to, label, icon: Icon }) => (
            <SidebarNavLink key={to} to={to} label={label} icon={Icon} />
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
