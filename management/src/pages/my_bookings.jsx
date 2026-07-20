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
    const link = document.createElement("a");
    link.href = `http://localhost:3000/api/tickets/${ticketId}/qr`;
    link.target = "_blank";
    // Fetch the SVG via the API
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
    <div className="page">
      <h1>My Bookings</h1>

      {tickets.length === 0 ? (
        <p className="empty">You haven't booked any tickets yet.</p>
      ) : (
        <div className="bookings-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="booking-card">
              <div className="booking-info">
                <h3>{ticket.eventTitle}</h3>
                <p><strong>Location:</strong> {ticket.eventLocation}</p>
                <p><strong>Dates:</strong> {ticket.eventStartDate} - {ticket.eventEndDate}</p>
                <p><strong>Quantity:</strong> {ticket.quantity}</p>
                <p><strong>Booked on:</strong> {ticket.bookingDate}</p>
                <span className={`status-badge ${ticket.scanned ? "status-approved" : "status-pending"}`}>
                  {ticket.scanned ? "Attended" : "Not yet attended"}
                </span>
              </div>
              <div className="booking-actions">
                <button onClick={() => downloadQR(ticket.id)} className="btn btn-primary">
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
