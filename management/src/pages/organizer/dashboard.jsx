// src/pages/organizer/OrganizerDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { CATEGORY_ICONS } from "../../constants/categories";

function formatDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingEvents: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch organizer stats
      const statsRes = await api.get("/organizer/stats");
      setStats(statsRes);

      // Fetch recent events
      const eventsRes = await api.get("/organizer/events/recent");
      setRecentEvents(eventsRes);

      // Fetch all my events and keep only the approved ones
      const myEvents = await api.get("/events/organizer/my-events");
      setApprovedEvents(myEvents.filter((e) => e.status === "Approved"));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="page">
      <div className="me-header">
        <div>
          <h1>📊 Organizer Dashboard</h1>
          <p className="me-subtitle">Welcome back, {user?.fullname || "Organizer"}! Here's what's happening with your events.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="me-stats">
        <div
          className="me-stat dashboard-stat-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/organizer/events")}
          title="View all events"
        >
          <span className="me-stat-icon">🎪</span>
          <div>
            <div className="me-stat-value">{stats.totalEvents}</div>
            <div className="me-stat-label">Total Events</div>
          </div>
        </div>
        <div
          className="me-stat dashboard-stat-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/organizer/analytics")}
          title="View bookings analytics"
        >
          <span className="me-stat-icon">🎟️</span>
          <div>
            <div className="me-stat-value">{stats.totalBookings}</div>
            <div className="me-stat-label">Total Bookings</div>
          </div>
        </div>
        <div
          className="me-stat dashboard-stat-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/organizer/analytics")}
          title="View revenue analytics"
        >
          <span className="me-stat-icon">💰</span>
          <div>
            <div className="me-stat-value">ETB {stats.totalRevenue}</div>
            <div className="me-stat-label">Total Revenue</div>
          </div>
        </div>
        <div
          className="me-stat dashboard-stat-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/organizer/events")}
          title="View all events"
        >
          <span className="me-stat-icon">⏳</span>
          <div>
            <div className="me-stat-value">{stats.pendingEvents}</div>
            <div className="me-stat-label">Pending Events</div>
          </div>
        </div>
        <div
          className="me-stat dashboard-stat-link"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/organizer/events?status=approved")}
          title="View approved events"
        >
          <span className="me-stat-icon">✅</span>
          <div>
            <div className="me-stat-value">{approvedEvents.length}</div>
            <div className="me-stat-label">Approved Events</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="me-section">
        <div className="me-attendees-head" style={{ borderBottom: "none" }}>
          <h2>⚡ Quick Actions</h2>
        </div>
        <div className="me-actions" style={{ marginTop: "4px" }}>
          <button className="me-action me-edit" onClick={() => navigate("/organizer/create")}>
            ➕ Create Event
          </button>
          <button className="me-action me-attendees" onClick={() => navigate("/organizer/events")}>
            📋 Manage Events
          </button>
          <button className="me-action me-attendees" onClick={() => navigate("/organizer/analytics")}>
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Recent Events */}
      <div className="me-section">
        <div className="me-attendees-head" style={{ borderBottom: "none" }}>
          <div>
            <h2>🕑 Recent Events</h2>
            <p className="me-subtitle">Your latest events at a glance.</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/organizer/events")}>
            View All
          </button>
        </div>

        {recentEvents.length > 0 ? (
          <div className="me-grid">
            {recentEvents.map((event) => {
              const statusClass =
                event.status === "Approved" ? "approved" :
                event.status === "Rejected" ? "rejected" : "pending";
              return (
                <div
                  key={event.id}
                  className="me-card dashboard-stat-link"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/organizer/events")}
                >
                  <div className="me-card-media">
                    {event.photo ? (
                      <img src={event.photo} alt={event.title} />
                    ) : (
                      <div className="me-media-placeholder">
                        <span>{CATEGORY_ICONS[event.category] || "🎪"}</span>
                      </div>
                    )}
                    <span className={`me-status ${statusClass}`}>{event.status || "Pending"}</span>
                  </div>
                  <div className="me-card-body">
                    <div className="me-card-top">
                      <span className="me-category">{CATEGORY_ICONS[event.category] || "🎪"} {event.category}</span>
                    </div>
                    <h3 className="me-title">{event.title}</h3>
                    <p className="me-meta">📅 {formatDateStr(event.startDate)}</p>
                    <p className="me-meta">📍 {event.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="me-empty" style={{ padding: "30px 10px" }}>
            <span className="me-empty-icon">🎪</span>
            <h3>No Events Yet</h3>
            <p>Create your first event and start selling tickets.</p>
            <button className="btn btn-primary" onClick={() => navigate("/organizer/create")}>
              + Create Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
