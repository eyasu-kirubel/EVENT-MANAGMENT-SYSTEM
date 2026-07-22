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
    <div className="page page-enter">
      <h1 style={{ marginBottom: 8 }}>Manage Events</h1>
      <p style={{ color: "#64748b", marginBottom: 32, fontSize: "0.9rem" }}>View attendees and track check-ins</p>

      {events.length === 0 ? (
        <div className="m2-empty">
          <h3>No events found</h3>
          <p>Create an event to start tracking attendees</p>
        </div>
      ) : (
        <>
          <div className="events-select">
            {events.map((event) => (
              <button
                key={event.id}
                className={`btn ${selectedEvent === event.id ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: 12 }}
                onClick={() => viewAttendees(event.id)}
              >
                {event.title} ({event.ticketsSold || 0})
              </button>
            ))}
          </div>

          {selectedEvent && (
            <div className="attendees-section">
              <h2 style={{ marginBottom: 16 }}>Attendees</h2>
              {attendeesLoading ? (
                <p style={{ color: "#64748b" }}>Loading...</p>
              ) : attendees.length === 0 ? (
                <div className="m2-empty">
                  <h3>No attendees yet</h3>
                  <p>Attendees will appear here once tickets are booked</p>
                </div>
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
                          <td style={{ fontWeight: 600 }}>{a.fullname}</td>
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
