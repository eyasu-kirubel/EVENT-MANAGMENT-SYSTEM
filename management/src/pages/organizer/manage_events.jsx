import { useState, useEffect } from "react";
import { api } from "../../utils/api";

export default function ManageEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

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

  async function viewAttendees(eventId) {
    setSelectedEvent(eventId);
    setAttendeesLoading(true);
    try {
      const data = await api.get(`/attendance/event/${eventId}`);
      setAttendees(data.attendees || []);
    } catch {
      setAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="page">
      <h1>Manage Events & Attendance</h1>

      {events.length === 0 ? (
        <p className="empty">No events found.</p>
      ) : (
        <>
          <div className="events-select">
            {events.map((event) => (
              <button
                key={event.id}
                className={`btn ${selectedEvent === event.id ? "btn-primary" : "btn-outline"}`}
                onClick={() => viewAttendees(event.id)}
              >
                {event.title} ({event.ticketsSold || 0} tickets)
              </button>
            ))}
          </div>

          {selectedEvent && (
            <div className="attendees-section">
              <h2>Attendees</h2>
              {attendeesLoading ? (
                <p>Loading...</p>
              ) : attendees.length === 0 ? (
                <p className="empty">No attendees yet.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Scanned At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((a) => (
                        <tr key={a.id}>
                          <td>{a.fullname}</td>
                          <td>{a.phonenumber}</td>
                          <td>{a.quantity}</td>
                          <td>
                            <span className={`status-badge ${a.scanned ? "status-approved" : "status-pending"}`}>
                              {a.scanned ? "Checked In" : "Pending"}
                            </span>
                          </td>
                          <td>{a.scannedAt || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
