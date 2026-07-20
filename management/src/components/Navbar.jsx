import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
    setMenuOpen(false);
  }

  return (
    <nav className="m2-nav">
      <div className="m2-nav-inner">
        <Link to="/events" className="m2-brand">
          <div className="m2-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7 10L12 7L17 10V17L12 14L7 17V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </div>
          EventManager
        </Link>

        <button className="m2-burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={menuOpen ? "open" : ""} />
        </button>

        <div className={`m2-nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/events" onClick={() => setMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Events
          </Link>

          {user && user.role === "user" && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1.5 6.5L5 9L8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              My Bookings
            </Link>
          )}

          {user && user.role === "organizer" && (
            <>
              <Link to="/organizer" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/organizer/create" onClick={() => setMenuOpen(false)}>Create Event</Link>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <Link to="/admin" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/admin/pending" onClick={() => setMenuOpen(false)}>Pending</Link>
              <Link to="/admin/users" onClick={() => setMenuOpen(false)}>Users</Link>
            </>
          )}

          <div className="m2-nav-spacer" />

          {user ? (
            <div className="m2-nav-user">
              <div className="m2-avatar">
                {user.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="m2-nav-user-info">
                <span className="m2-nav-user-name">{user.fullname}</span>
                <span className="m2-nav-user-role">{user.role}</span>
              </div>
              <button onClick={handleLogout} className="m2-logout">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3.5C2.67 14 2 13.33 2 12.5V3.5C2 2.67 2.67 2 3.5 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10.5 12L14 8L10.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="m2-nav-auth">
              <Link to="/login" className="m2-btn-login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="m2-btn-register" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
