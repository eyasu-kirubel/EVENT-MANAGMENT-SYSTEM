import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { BsCheckCircle, BsClockHistory, BsPeople, BsTicketPerforated, BsCollection, BsShieldLock } from "react-icons/bs";


export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listMode, setListMode] = useState(null);
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    loadStats();
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
    { icon: BsPeople, value: stats?.totalUsers, label: "Customers", to: "/admin/users?role=Customer" },
    { icon: BsCollection, value: stats?.totalOrganizers, label: "Organizers", to: "/admin/users?role=Organizer" },
    { icon: BsCollection, value: stats?.totalEvents, label: "Total Events", action: () => toggleList("all") },
    { icon: BsClockHistory, value: stats?.pendingEvents, label: "Pending Approval", to: "/admin/pending" },
    { icon: BsCheckCircle, value: stats?.approvedEvents, label: "Approved Events", action: () => toggleList("approved") },
    { icon: BsTicketPerforated, value: stats?.totalTickets, label: "Tickets Sold", to: "/admin/tickets" },
  ];

  const listEvents =
    listMode === "all"
      ? events
      : listMode === "approved"
        ? (events || []).filter((e) => String(e.status) === "Approved")
        : [];
  const listTitle = listMode === "all" ? "All Events" : "Approved Events";
  const listCount = listMode === "all" ? stats?.totalEvents : stats?.approvedEvents;

  return (
    <div className="admin-wrap">
      <div className="admin-hero">
        <span className="admin-hero-badge"><BsShieldLock /> Admin Panel</span>
        <h1 className="admin-hero-title">Admin <span>Dashboard</span></h1>
        <p className="admin-hero-sub">Monitor users, events and approvals across the platform.</p>
      </div>

      {stats && (
        <div className="admin-stats">
          {statCards.map(({ icon: Icon, ...s }) =>
            s.to ? (
              <Link className="admin-stat" key={s.label} to={s.to}>
                <div className="admin-stat-icon"><Icon /></div>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </Link>
            ) : s.action ? (
              <button className="admin-stat" key={s.label} onClick={s.action} style={{ cursor: "pointer", textAlign: "center", fontFamily: "inherit", outline: "none" }}>
                <div className="admin-stat-icon"><Icon /></div>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </button>
            ) : (
              <div className="admin-stat" key={s.label}>
                <div className="admin-stat-icon"><Icon /></div>
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

      <style>{`
        /* FINAL FIX: quick-action text must remain readable in both light and dark modes. */
        .admin-wrap .admin-quick-card,
        body.dark-mode .admin-wrap .admin-quick-card {
          opacity: 1 !important;
          filter: none !important;
        }
        .admin-wrap .admin-quick-card h4,
        body.dark-mode .admin-wrap .admin-quick-card h4 {
          color: #24204f !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #24204f !important;
          text-shadow: none !important;
        }
        .admin-wrap .admin-quick-card p,
        body.dark-mode .admin-wrap .admin-quick-card p {
          color: #596174 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #596174 !important;
          text-shadow: none !important;
        }
        .admin-wrap .admin-quick-icon,
        body.dark-mode .admin-wrap .admin-quick-icon {
          color: #596174 !important;
          opacity: 1 !important;
        }
        .admin-wrap .admin-quick-icon svg,
        body.dark-mode .admin-wrap .admin-quick-icon svg {
          color: #596174 !important;
          opacity: 1 !important;
          stroke: currentColor !important;
        }
        .admin-wrap .admin-quick-arrow,
        body.dark-mode .admin-wrap .admin-quick-arrow {
          color: #4527a0 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #4527a0 !important;
        }
      `}</style>

      <div className="admin-quick">
        <Link to="/admin/pending" className="admin-quick-card">
          <span className="admin-quick-icon"><BsClockHistory /></span>
          <div>
            <h4>Review Pending Events</h4>
            <p>Approve or reject new event submissions.</p>
          </div>
          <span className="admin-quick-arrow">→</span>
        </Link>
        <Link to="/admin/users" className="admin-quick-card">
          <span className="admin-quick-icon"><BsPeople /></span>
          <div>
            <h4>Manage Users</h4>
            <p>Change roles or remove accounts.</p>
          </div>
          <span className="admin-quick-arrow">→</span>
        </Link>
        <Link to="/admin/tickets" className="admin-quick-card">
          <span className="admin-quick-icon"><BsTicketPerforated /></span>
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
