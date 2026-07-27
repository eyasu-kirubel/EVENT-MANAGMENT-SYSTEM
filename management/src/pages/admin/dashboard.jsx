import { useState, useEffect } from "react";
import { api } from "../../utils/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.totalUsers}</h3>
            <p>Customers</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalOrganizers}</h3>
            <p>Organizers</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalEvents}</h3>
            <p>Total Events</p>
          </div>
          <div className="stat-card">
            <h3>{stats.pendingEvents}</h3>
            <p>Pending Approval</p>
          </div>
          <div className="stat-card">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved Events</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalTickets}</h3>
            <p>Tickets Sold</p>
          </div>
        </div>
      )}
    </div>
  );
}
