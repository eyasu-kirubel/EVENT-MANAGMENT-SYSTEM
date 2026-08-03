import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import { CATEGORY_ICONS } from "../../constants/categories";

const FILTERS = [
  { value: "", label: "All" },
  { value: "Approved", label: "Approved" },
  { value: "Pending", label: "Pending" },
  { value: "Rejected", label: "Rejected" },
];

function formatDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getMinTierPrice(event) {
  const tiers = Array.isArray(event.ticketTiers) ? event.ticketTiers : [];
  if (tiers.length === 0) return event.price;
  return Math.min(...tiers.map((t) => Number(t.price) || 0));
}

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const statusFilter = ["Approved", "Pending", "Rejected"].includes(searchParams.get("status"))
    ? searchParams.get("status")
    : "";
  const filteredEvents = statusFilter ? events.filter((e) => e.status === statusFilter) : events;

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
    if (selectedEvent === eventId) {
      setSelectedEvent(null);
      setAttendees([]);
      return;
    }
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

  async function handleDelete(id) {
    if (!confirm("Delete this event? This will also remove all booked tickets.")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
      if (selectedEvent === id) { setSelectedEvent(null); setAttendees([]); }
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="page">
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>

      <div className="me-header">
        <div>
          <h1>Manage Events & Attendance</h1>
          <p className="me-subtitle">Keep track of your events, ticket sales and check-ins.</p>
        </div>
        <Link to="/organizer/create" className="btn btn-primary me-create-btn">+ Create Event</Link>
      </div>

      <div className="me-filters">
        {FILTERS.map((f) => {
          const active = (statusFilter || "") === f.value;
          return (
            <button
              key={f.value}
              className={`me-filter ${active ? "active" : ""}`}
              onClick={() => setSearchParams(f.value ? { status: f.value } : {})}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="me-empty">
          <span className="me-empty-icon">🎪</span>
          <h3>{statusFilter ? `No ${statusFilter} Events` : "No Events Yet"}</h3>
          <p>{statusFilter ? "No events match this status right now." : "Create your first event and start selling tickets."}</p>
          <Link to="/organizer/create" className="btn btn-primary">+ Create Event</Link>
        </div>
      ) : (
        <div className="me-grid">
          {filteredEvents.map((event) => {
            const sold = Number(event.ticketsSold) || 0;
            const capacity = Number(event.capacity) || 0;
            const pct = capacity > 0 ? Math.min(100, (sold / capacity) * 100) : 0;
            const statusClass =
              event.status === "Approved" ? "approved" :
              event.status === "Rejected" ? "rejected" : "pending";
            const barClass = pct >= 100 ? "full" : pct >= 80 ? "high" : "";
            const price = getMinTierPrice(event);
            return (
              <div key={event.id} className={`me-card ${selectedEvent === event.id ? "selected" : ""}`}>
                <div className="me-card-media">
                  {event.photo ? (
                    <img src={event.photo} alt={event.title} />
                  ) : (
                    <div className="me-media-placeholder">
                      <span>{CATEGORY_ICONS[event.category] || "🎪"}</span>
                    </div>
                  )}
                  <span className={`me-status ${statusClass}`}>{event.status}</span>
                </div>

                <div className="me-card-body">
                  <div className="me-card-top">
                    <span className="me-category">{CATEGORY_ICONS[event.category] || "🎪"} {event.category}</span>
                    <span className="me-price">{price === 0 ? "Free" : `ETB ${price}`}</span>
                  </div>
                  <h3 className="me-title">{event.title}</h3>
                  <p className="me-meta">📅 {formatDateStr(event.startDate)}{event.endDate ? ` — ${formatDateStr(event.endDate)}` : ""}</p>
                  <p className="me-meta">📍 {event.location}</p>

                  <div className="me-progress">
                    <div className={`me-progress-fill ${barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="me-sold">
                    <strong>{sold}</strong> / {capacity} tickets sold
                    {capacity > 0 && <span className="me-pct">{Math.round(pct)}%</span>}
                  </p>

                  <div className="me-actions">
                    <button
                      className={`me-action me-attendees ${selectedEvent === event.id ? "active" : ""}`}
                      onClick={() => viewAttendees(event.id)}
                    >
                      👥 Attendees
                    </button>
                    <button className="me-action me-edit" onClick={() => navigate(`/organizer/create?edit=${event.id}`)}>
                      ✏️ Edit
                    </button>
                    <button className="me-action me-delete" onClick={() => handleDelete(event.id)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedEvent && (
        <div className="me-attendees-panel">
          <div className="me-attendees-head">
            <div>
              <h2>👥 Attendees</h2>
              <p className="me-subtitle">
                {events.find((e) => e.id === selectedEvent)?.title} · {attendees.length} registered
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => { setSelectedEvent(null); setAttendees([]); }}>
              Close
            </button>
          </div>

          {attendeesLoading ? (
            <div className="loading" style={{ padding: "30px 10px" }}>Loading attendees...</div>
          ) : attendees.length === 0 ? (
            <div className="me-empty" style={{ padding: "30px 10px" }}>
              <span className="me-empty-icon">🎫</span>
              <h3>No Attendees Yet</h3>
              <p>Tickets sold for this event will show up here.</p>
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
    </div>
  );
}
