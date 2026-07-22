import { useState, useEffect } from "react";
import { api } from "../../utils/api";

export default function PendingEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await api.get("/admin/events/pending");
      setEvents(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function approve(id) {
    try {
      await api.put(`/admin/events/${id}/approve`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function reject(id) {
    try {
      await api.put(`/admin/events/${id}/reject`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading pending events...</div>;

  return (
    <div className="page page-enter">
      <h1 style={{ marginBottom: 8 }}>Pending Events</h1>
      <p style={{ color: "#64748b", marginBottom: 32, fontSize: "0.9rem" }}>Review and approve event submissions</p>

      {events.length === 0 ? (
        <div className="m2-empty">
          <h3>All caught up</h3>
          <p>No pending events to review</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Organizer</th>
                <th>Category</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td style={{ fontWeight: 600 }}>{event.title}</td>
                  <td>{event.organizerName}</td>
                  <td>{event.category}</td>
                  <td>{event.location}</td>
                  <td>{event.startDate} — {event.endDate}</td>
                  <td>{event.capacity}</td>
                  <td className="actions-cell">
                    <button onClick={() => approve(event.id)} className="btn btn-success btn-sm" style={{ borderRadius: 8 }}>Approve</button>
                    <button onClick={() => reject(event.id)} className="btn btn-danger btn-sm" style={{ borderRadius: 8 }}>Reject</button>
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
