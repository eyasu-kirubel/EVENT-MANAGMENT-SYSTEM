import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

export default function OrganizerAnalytics() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const data = await api.get("/events/organizer/my-events");
      setEvents(data);
    } catch {} finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  const totalBookings = events.reduce((s, e) => s + (e.ticketsSold || 0), 0);
  const totalRevenue = events.reduce((s, e) => s + (e.price || 0) * (e.ticketsSold || 0), 0);
  const totalCapacity = events.reduce((s, e) => s + (e.capacity || 0), 0);
  const approved = events.filter((e) => e.status === "Approved");
  const fillRate = totalCapacity ? Math.round((totalBookings / totalCapacity) * 100) : 0;

  return (
    <div>
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>
      <h1>Analytics</h1>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><h3>{events.length}</h3><p>Total Events</p></div>
        <div className="stat-card"><h3>{approved.length}</h3><p>Approved</p></div>
        <div className="stat-card"><h3>{totalBookings}</h3><p>Total Bookings</p></div>
        <div className="stat-card"><h3>{totalRevenue} ETB</h3><p>Revenue</p></div>
        <div className="stat-card"><h3>{fillRate}%</h3><p>Fill Rate</p></div>
      </div>
      {events.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Capacity</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Fill %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const sold = e.ticketsSold || 0;
                const cap = e.capacity || 1;
                const fill = Math.round((sold / cap) * 100);
                return (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{cap}</td>
                    <td>{sold}</td>
                    <td>{(e.price || 0) * sold} ETB</td>
                    <td>{fill}%</td>
                    <td><span className={`status-badge status-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
