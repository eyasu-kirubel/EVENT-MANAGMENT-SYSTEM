import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import EventsManager from "./EventsManager";
import UsersManager from "./UsersManager";
import BookingsManager from "./BookingsManager";

// BACKGROUND IMAGE
const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", description: "Overview & Stats" },
  { key: "events", label: "Events", icon: "📅", description: "Manage Events" },
  { key: "users", label: "Users", icon: "👥", description: "User Management" },
  { key: "bookings", label: "Bookings", icon: "🎟️", description: "View Bookings" },
];

//NOTIFICATIONS
const NOTIFICATIONS = [
  { id: 1, text: "📢 New event request from organizer", path: "/admin/events/approve" },
  { id: 2, text: "👤 New organizer registration request", path: "/admin/users/approve" },
  { id: 3, text: "🎟️ New booking request", path: "/admin/bookings/approve" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigate = useNavigate();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date
  const formatDate = (date) => {
    const options = { month: 'numeric', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Format time
  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminToken");
      navigate("/login");
    }
  };

  const handleNotificationClick = (notification) => {
    setShowNotifications(false);
    setNotificationCount(prev => Math.max(0, prev - 1));
    navigate(notification.path);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "events":
        return <EventsManager />;
      case "users":
        return <UsersManager />;
      case "bookings":
        return <BookingsManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={styles.container}>

      <div style={styles.background} />
      <div style={styles.overlay} />

      <aside style={{
        ...styles.sidebar,
        width: sidebarCollapsed ? '80px' : '260px',
        transition: 'width 0.3s ease',
      }}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>
            {sidebarCollapsed ? '🎪' : '🎪 Event Admin'}
          </h2>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={styles.collapseBtn}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
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
                  <small style={styles.navDescription}>{item.description}</small>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.bottomSection}>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={styles.notificationBtn}
          >
            🔔
            {notificationCount > 0 && (
              <span style={styles.notificationBadge}>{notificationCount}</span>
            )}
          </button>


          {showNotifications && (
            <div style={styles.notificationDropdown}>
              {NOTIFICATIONS.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={styles.notificationItem}
                >
                  {notif.text}
                </div>
              ))}
            </div>
          )}


          <div style={styles.widgetContainer}>
            <div style={styles.datetimeWidget}>
              <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>
              <span style={styles.dateDisplay}>{formatDate(currentTime)}</span>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            {sidebarCollapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </aside>


      <main style={{
        ...styles.content,
        marginLeft: sidebarCollapsed ? '80px' : '260px',
        transition: 'margin-left 0.3s ease',
      }}>
        <div style={styles.contentHeader}>
          <h1 style={styles.pageTitle}>
            {NAV_ITEMS.find(item => item.key === activeTab)?.label}
          </h1>
          <div style={styles.headerRight}>
            <span style={styles.welcomeText}>Welcome back, Admin! 👋</span>
          </div>
        </div>

        <div style={styles.contentBody}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// STYLES
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${BACKGROUND_IMAGE})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: 'rgba(20, 20, 30, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    color: 'white',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    marginBottom: '30px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: 'white',
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    fontSize: '14px',
    transition: 'background 0.2s ease',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '0 10px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '15px',
    width: '100%',
    transition: 'background 0.2s ease, color 0.2s ease',
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'white',
  },
  navItemHover: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255,255,255,0.8)',
  },
  navIcon: {
    fontSize: '20px',
    minWidth: '30px',
  },
  navLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },
  navDescription: {
    fontSize: '10px',
    opacity: 0.4,
    fontWeight: 'normal',
  },
  bottomSection: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificationBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'background 0.2s ease',
    position: 'relative',
    alignSelf: 'flex-start',
  },
  notificationBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: '#ff4444',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  notificationDropdown: {
    position: 'absolute',
    bottom: '180px',
    left: '20px',
    background: 'rgba(30, 30, 50, 0.98)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '12px',
    minWidth: '250px',
    color: 'white',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.05)',
    zIndex: 10,
  },
  notificationItem: {
    padding: '10px 14px',
    marginBottom: '4px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.9)',
    transition: 'background 0.2s ease',
  },
  widgetContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '5px',
  },
  datetimeWidget: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  timeDisplay: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  dateDisplay: {
    opacity: 0.7,
  },
  logoutBtn: {
    background: 'rgba(255, 68, 68, 0.08)',
    border: '1px solid rgba(255, 68, 68, 0.1)',
    color: 'rgba(255,255,255,0.7)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s ease, color 0.2s ease',
    width: '100%',
    marginTop: '5px',
  },
  content: {
    flex: 1,
    padding: '25px 30px',
    position: 'relative',
    zIndex: 2,
    marginLeft: '260px',
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  pageTitle: {
    color: 'white',
    fontSize: '28px',
    fontWeight: 'bold',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '15px',
    background: 'rgba(255,255,255,0.05)',
    padding: '8px 16px',
    borderRadius: '20px',
  },
  contentBody: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '25px',
    minHeight: '400px',
    border: '1px solid rgba(255,255,255,0.05)',
    color: 'white',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
};

// Hover styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .notification-item:hover {
    background: rgba(255, 255, 255, 0.05) !important;
  }
  
  .logout-btn:hover {
    background: rgba(255, 68, 68, 0.15) !important;
    color: white !important;
  }
`;
document.head.appendChild(styleSheet);