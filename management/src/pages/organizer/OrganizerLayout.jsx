// src/pages/organizer/OrganizerLayout.jsx
import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import bg1 from "../../assets/images/bg1.jpg";
import bg2 from "../../assets/images/bg2.jpg";
import bg3 from "../../assets/images/bg3.jpg";
import bg4 from "../../assets/images/bg4.jpg";
import bg5 from "../../assets/images/bg5.jpg";
import bg6 from "../../assets/images/bg6.jpg";
import bg7 from "../../assets/images/bg7.jpg";
import bg8 from "../../assets/images/bg8.jpg";
import bg9 from "../../assets/images/bg9.jpg";

const BACKGROUND_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8, bg9];

export default function OrganizerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setBgIndex((i) => (i + 1) % BACKGROUND_IMAGES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Rotating background image */}
      <div style={{ ...styles.bg, backgroundImage: `url(${BACKGROUND_IMAGES[bgIndex]})` }} />
      <div style={styles.bgOverlay} />

      {/* Toggle button */}
      <button
        className="org-sidebar-toggle"
        style={{ ...styles.toggleBtn, ...(collapsed ? styles.toggleBtnCollapsed : {}) }}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        title={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        <span style={{ ...styles.toggleIcon, transform: collapsed ? "rotate(0deg)" : "rotate(0deg)" }}>
          {collapsed ? "❯" : "❮"}
        </span>
      </button>

      {/* Sidebar Navigation */}
      <aside style={{ ...styles.sidebar, ...(collapsed ? styles.sidebarCollapsed : {}) }}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎪</span>
          <span style={styles.logoText}>Organizer</span>
        </div>

        <nav style={styles.nav}>
          <NavLink 
            to="/organizer" end
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
          >
            <span style={styles.navIcon}>📊</span>
            Dashboard
          </NavLink>

          <NavLink 
            to="/organizer/browse" 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
          >
            <span style={styles.navIcon}>📅</span>
            Events
          </NavLink>

          <NavLink 
            to="/organizer/create" 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
          >
            <span style={styles.navIcon}>➕</span>
            Create Event
          </NavLink>

          <NavLink 
            to="/organizer/events" 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
          >
            <span style={styles.navIcon}>📋</span>
            Manage Events
          </NavLink>
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <span style={styles.userAvatar}>👤</span>
            <div>
              <div style={styles.userName}>{user?.fullname || "Organizer"}</div>
              <div style={styles.userRole}>Organizer</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="org-main" style={{ ...styles.mainContent, ...(collapsed ? styles.mainContentCollapsed : {}) }}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    transition: 'background-image 0.8s ease',
  },
  bgOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    zIndex: 0,
  },
  toggleBtn: {
    position: 'fixed',
    top: '24px',
    left: '238px',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c5ce7, #a855f7)',
    border: '2px solid rgba(255,255,255,0.85)',
    boxShadow: '0 4px 14px rgba(108,92,231,0.5)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
    transition: 'left 0.3s ease, transform 0.25s ease, box-shadow 0.25s ease',
  },
  toggleBtnCollapsed: {
    left: '10px',
  },
  toggleIcon: {
    fontSize: '22px',
    lineHeight: 1,
    fontWeight: 'bold',
    fontFamily: 'system-ui, sans-serif',
  },
  sidebar: {
    width: '250px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    transition: 'transform 0.3s ease',
  },
  sidebarCollapsed: {
    transform: 'translateX(-100%)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 24px 30px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    borderRadius: '10px',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  },
  navLinkActive: {
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
  },
  navIcon: {
    fontSize: '18px',
  },
  userSection: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  userAvatar: {
    fontSize: '32px',
  },
  userName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  userRole: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255,68,68,0.15)',
    border: '1px solid rgba(255,68,68,0.2)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: 1,
    marginLeft: '250px',
    padding: '30px',
    minHeight: '100vh',
    transition: 'margin-left 0.3s ease',
    position: 'relative',
    zIndex: 1,
  },
  mainContentCollapsed: {
    marginLeft: '0px',
  },
};