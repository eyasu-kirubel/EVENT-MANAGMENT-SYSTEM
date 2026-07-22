import { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function MyBookingsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const data = await api.get("/tickets/my");
      setTickets(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function downloadQR(ticketId) {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:3000/api/tickets/${ticketId}/qr`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.text())
      .then((svg) => {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ticket-${ticketId}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) return <div className="loading">Loading your bookings...</div>;

  return (
    <div className="page page-enter">
      <h1 style={{ marginBottom: 8 }}>My Bookings</h1>
      <p style={{ color: "#64748b", marginBottom: 32, fontSize: "0.9rem" }}>View and manage your event tickets</p>

      {tickets.length === 0 ? (
        <div className="m2-empty">
          <div className="m2-empty-icon">
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="10" width="36" height="28" rx="4" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M6 18L18 26L30 18" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3>No bookings yet</h3>
          <p>Browse events and book your first ticket</p>
        </div>
      ) : (
        <div className="bookings-list">
          {tickets.map((ticket, i) => (
            <div
              key={ticket.id}
              className="booking-card"
              style={{ animation: `m2CardIn 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both` }}
            >
              <div className="booking-info">
                <h3>{ticket.eventTitle}</h3>
                <p>{ticket.eventLocation} &middot; {ticket.eventStartDate} — {ticket.eventEndDate}</p>
                <p style={{ marginTop: 4 }}>
                  Qty: {ticket.quantity} &middot; Booked: {ticket.bookingDate}
                </p>
                <span className={`status-badge ${ticket.scanned ? "status-approved" : "status-pending"}`} style={{ marginTop: 8 }}>
                  {ticket.scanned ? "Attended" : "Pending"}
                </span>
              </div>
              <div className="booking-actions">
                <button onClick={() => downloadQR(ticket.id)} className="btn btn-primary" style={{ borderRadius: 12 }}>
                  Download QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
