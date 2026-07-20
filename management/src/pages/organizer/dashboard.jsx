import { useState, useEffect } from "react";
import { api } from "../../utils/api";

export default function OrganizerDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await api.get("/events/organizer/my-events");
      setEvents(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this event?")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const totalTickets = events.reduce((sum, e) => sum + (e.ticketsSold || 0), 0);

  return (
    <div className="page">
      <h1>Organizer Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{events.length}</h3>
          <p>Total Events</p>
        </div>
        <div className="stat-card">
          <h3>{events.filter((e) => e.status === "Approved").length}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card">
          <h3>{events.filter((e) => e.status === "Pending").length}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card">
          <h3>{totalTickets}</h3>
          <p>Tickets Sold</p>
        </div>
      </div>

      <h2>My Events</h2>
      {events.length === 0 ? (
        <p className="empty">You haven't created any events yet.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Tickets Sold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{event.category}</td>
                  <td>{event.location}</td>
                  <td>{event.startDate} - {event.endDate}</td>
                  <td><span className={`status-badge status-${event.status.toLowerCase()}`}>{event.status}</span></td>
                  <td>{event.ticketsSold || 0}</td>
                  <td>
                    <button onClick={() => handleDelete(event.id)} className="btn btn-danger btn-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
