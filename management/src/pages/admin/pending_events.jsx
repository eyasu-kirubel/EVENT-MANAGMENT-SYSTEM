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
    <div className="page">
      <h1>Pending Events</h1>

      {events.length === 0 ? (
        <p className="empty">No pending events to review.</p>
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
                  <td>{event.title}</td>
                  <td>{event.organizerName}</td>
                  <td>{event.category}</td>
                  <td>{event.location}</td>
                  <td>{event.startDate} - {event.endDate}</td>
                  <td>{event.capacity}</td>
                  <td className="actions-cell">
                    <button onClick={() => approve(event.id)} className="btn btn-success btn-sm">Approve</button>
                    <button onClick={() => reject(event.id)} className="btn btn-danger btn-sm">Reject</button>
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
