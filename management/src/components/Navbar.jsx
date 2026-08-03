import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navTab = new URLSearchParams(location.search).get("tab");
  const onEventsPage = location.pathname === "/events" || location.pathname === "/organizer/browse";
  const isEventsTab = onEventsPage && !navTab;
  const isBookingsTab = navTab === "bookings";
  const isFavoritesTab = navTab === "favorites";
  const isSettingsTab = navTab === "settings";

  function handleLogout() {
    logout();
    navigate("/login");
    setMenuOpen(false);
  }

  return (
    <nav className="g-nav">
      <div className="g-nav-inner">
        <Link to="/events" className="g-brand">
          <span className="g-brand-icon">🎪</span>
          <span className="g-brand-text">
            {user?.isOrganizer
              ? "Event Organizer"
              : user && user.role === "user"
                ? "Users"
                : user && user.role === "admin"
                  ? "Event Admin"
                  : ""}
          </span>
        </Link>

        <button className="g-burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={menuOpen ? "open" : ""} />
        </button>

        <div className={`g-nav-right ${menuOpen ? "open" : ""}`}>
          {user && user.role === "admin" && (
            <div className="g-nav-admin-links">
              <Link to="/admin" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/admin/pending" onClick={() => setMenuOpen(false)}>Pending</Link>
              <Link to="/admin/users" onClick={() => setMenuOpen(false)}>Users</Link>
            </div>
          )}

          {user ? (
            <div className="g-nav-user">
              <div className="g-nav-user-left">
                <div className="g-avatar">{user.fullname.charAt(0).toUpperCase()}</div>
                <div className="g-user-info">
                  <span className="g-user-name">{user.fullname}</span>
                  <span className="g-user-role">{user.isOrganizer ? "Organizer" : "Customer"}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="g-logout-btn">Log out</button>
            </div>
          ) : (
            <div className="g-nav-auth">
              <Link to="/login" className="g-btn-login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="g-btn-register" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      {user && user.role !== "admin" && onEventsPage && (
        <div className="g-nav-tabs">
          <Link
            to={location.pathname}
            className={`g-nav-tab ${isEventsTab ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            📅 Events
          </Link>
          <Link
            to={`${location.pathname}?tab=bookings`}
            className={`g-nav-tab ${isBookingsTab ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            🎫 My Bookings
          </Link>
          <Link
            to={`${location.pathname}?tab=favorites`}
            className={`g-nav-tab ${isFavoritesTab ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            ❤️ Favorites
          </Link>
          <Link
            to={`${location.pathname}?tab=history`}
            className={`g-nav-tab ${navTab === "history" ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            🕘 History
          </Link>
          <Link
            to={`${location.pathname}?tab=settings`}
            className={`g-nav-tab ${isSettingsTab ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            ⚙️ Settings
          </Link>
        </div>
      )}
    </nav>
  );
}
