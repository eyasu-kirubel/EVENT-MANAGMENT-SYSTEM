import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import EventsManager from "./EventsManager";
import UsersManager from "./UsersManager";
import BookingsManager from "./BookingsManager";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", description: "Overview & Stats" },
  { key: "events", label: "Events", icon: "📅", description: "Manage Events" },
  { key: "users", label: "Users", icon: "👥", description: "User Management" },
  { key: "bookings", label: "Bookings", icon: "🎟️", description: "View Bookings" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hoveredItem, setHoveredItem] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      if (parsed.role !== "admin") navigate("/login");
    } else {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const formatTime = (d) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "events": return <EventsManager />;
      case "users": return <UsersManager />;
      case "bookings": return <BookingsManager />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.videoBg}>
        <video autoPlay loop muted playsInline style={styles.video}
          poster="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80">
          <source src="https://cdn.pixabay.com/video/2020/07/30/45675-444601765_large.mp4" type="video/mp4" />
        </video>
        <div style={styles.overlay} />
      </div>

      <aside style={{
        ...styles.sidebar,
        width: sidebarCollapsed ? 72 : 260,
      }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logo}>{sidebarCollapsed ? '🎪' : '🎪 Event Admin'}</span>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={styles.collapseBtn}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                ...styles.navItem,
                ...(activeTab === item.key ? styles.navItemActive : {}),
                ...(hoveredItem === item.key ? styles.navItemHover : {}),
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                padding: sidebarCollapsed ? '12px' : '12px 18px',
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && (
                <div style={styles.navLabel}>
                  <span>{item.label}</span>
                  <small style={styles.navDesc}>{item.description}</small>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.bottomSection}>
          <div style={styles.datetimeWidget}>
            <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>
            <span style={styles.dateDisplay}>{formatDate(currentTime)}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            {sidebarCollapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </aside>

      <main style={{
        ...styles.content,
        marginLeft: sidebarCollapsed ? 72 : 260,
      }}>
        <div style={styles.contentHeader}>
          <h1 style={styles.pageTitle}>
            {NAV_ITEMS.find(i => i.key === activeTab)?.label}
          </h1>
          <span style={styles.welcomeText}>Welcome, {user?.fullname || 'Admin'} 👋</span>
        </div>
        <div style={styles.contentBody}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  videoBg: { position: 'fixed', inset: 0, zIndex: 0 },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(15, 10, 26, 0.85)' },
  sidebar: { position: 'fixed', top: 0, left: 0, height: '100vh', background: 'rgba(15, 10, 26, 0.95)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 3, display: 'flex', flexDirection: 'column', padding: '20px 0', transition: 'width 0.3s ease', overflow: 'hidden' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: 30 },
  logo: { fontSize: '18px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap' },
  collapseBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '50%', width: 28, height: 28, fontSize: '13px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 10px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: 8, fontSize: '14px', width: '100%', transition: 'all 0.2s' },
  navItemActive: { background: 'rgba(124,58,237,0.15)', color: 'white' },
  navItemHover: { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)' },
  navIcon: { fontSize: '18px', minWidth: 28 },
  navLabel: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 },
  navDesc: { fontSize: '10px', opacity: 0.4 },
  bottomSection: { padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 10 },
  datetimeWidget: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 },
  timeDisplay: { fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' },
  dateDisplay: { opacity: 0.7 },
  logoutBtn: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.1)', color: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: '13px', width: '100%', whiteSpace: 'nowrap' },
  content: { flex: 1, padding: '25px 30px', position: 'relative', zIndex: 2, transition: 'margin-left 0.3s ease', minHeight: '100vh' },
  contentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  pageTitle: { color: 'white', fontSize: '26px', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)', margin: 0 },
  welcomeText: { color: 'rgba(255,255,255,0.7)', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 20 },
  contentBody: { background: 'rgba(15,10,26,0.7)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: 24, minHeight: 400, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
};
