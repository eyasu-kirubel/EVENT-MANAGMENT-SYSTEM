import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const [listMode, setListMode] = useState(null);
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setBgIndex((i) => (i + 1) % BACKGROUND_IMAGES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  async function loadStats() {
    try {
      const data = await api.get("/admin/stats");
      setStats(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function toggleList(mode) {
    if (listMode === mode) {
      setListMode(null);
      return;
    }
    if (!events) {
      setEventsLoading(true);
      try {
        setEvents(await api.get("/admin/events"));
      } catch {
        // silent
      } finally {
        setEventsLoading(false);
      }
    }
    setListMode(mode);
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const statCards = [
    { icon: "👥", value: stats?.totalUsers, label: "Customers", to: "/admin/users?role=Customer" },
    { icon: "🎪", value: stats?.totalOrganizers, label: "Organizers", to: "/admin/users?role=Organizer" },
    { icon: "📅", value: stats?.totalEvents, label: "Total Events", action: () => toggleList("all") },
    { icon: "⏳", value: stats?.pendingEvents, label: "Pending Approval", to: "/admin/pending" },
    { icon: "✅", value: stats?.approvedEvents, label: "Approved Events", action: () => toggleList("approved") },
    { icon: "🎫", value: stats?.totalTickets, label: "Tickets Sold", to: "/admin/tickets" },
  ];

  const listEvents =
    listMode === "all"
      ? events
      : listMode === "approved"
        ? (events || []).filter((e) => String(e.status) === "Approved")
        : [];
  const listTitle = listMode === "all" ? "📅 All Events" : "✅ Approved Events";
  const listCount = listMode === "all" ? stats?.totalEvents : stats?.approvedEvents;

  return (
    <div className="admin-wrap">
      <div className="admin-bg" style={{ backgroundImage: `url(${BACKGROUND_IMAGES[bgIndex]})` }} />
      <div className="admin-bg-overlay" />

      <div className="admin-hero">
        <span className="admin-hero-badge">🛡️ Admin Panel</span>
        <h1 className="admin-hero-title">Admin <span>Dashboard</span></h1>
        <p className="admin-hero-sub">Monitor users, events and approvals across the platform.</p>
      </div>

      {stats && (
        <div className="admin-stats">
          {statCards.map((s) =>
            s.to ? (
              <Link className="admin-stat" key={s.label} to={s.to}>
                <div className="admin-stat-icon">{s.icon}</div>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </Link>
            ) : s.action ? (
              <button className="admin-stat" key={s.label} onClick={s.action} style={{ cursor: "pointer", textAlign: "center", fontFamily: "inherit", outline: "none" }}>
                <div className="admin-stat-icon">{s.icon}</div>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </button>
            ) : (
              <div className="admin-stat" key={s.label}>
                <div className="admin-stat-icon">{s.icon}</div>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            )
          )}
        </div>
      )}

      {listMode && (
        <div className="admin-events-panel">
          <div className="admin-events-head">
            <h3>{listTitle}</h3>
            <span>{listCount} total</span>
          </div>
          {eventsLoading ? (
            <div className="loading">Loading events...</div>
          ) : listEvents && listEvents.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Organizer</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listEvents.map((e) => {
                    const status = String(e.status || "");
                    const color =
                      status === "Approved" ? "#2e7d32" :
                      status === "Pending" ? "#b26a00" :
                      "#c62828";
                    return (
                      <tr key={e.id}>
                        <td>{e.title}</td>
                        <td>{e.organizerName}</td>
                        <td>{e.location}</td>
                        <td>{String(e.startDate || "").slice(0, 10)}</td>
                        <td>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            background: status === "Approved" ? "#e8f5e9" : status === "Pending" ? "#fff3e0" : "#ffebee",
                            color,
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">No events found.</p>
          )}
        </div>
      )}

      <div className="admin-quick">
        <Link to="/admin/pending" className="admin-quick-card">
          <span className="admin-quick-icon">⏳</span>
          <div>
            <h4>Review Pending Events</h4>
            <p>Approve or reject new event submissions.</p>
          </div>
          <span className="admin-quick-arrow">→</span>
        </Link>
        <Link to="/admin/users" className="admin-quick-card">
          <span className="admin-quick-icon">👥</span>
          <div>
            <h4>Manage Users</h4>
            <p>Change roles or remove accounts.</p>
          </div>
          <span className="admin-quick-arrow">→</span>
        </Link>
        <Link to="/admin/tickets" className="admin-quick-card">
          <span className="admin-quick-icon">🎫</span>
          <div>
            <h4>Tickets by Event</h4>
            <p>See how many tickets each event sold.</p>
          </div>
          <span className="admin-quick-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
