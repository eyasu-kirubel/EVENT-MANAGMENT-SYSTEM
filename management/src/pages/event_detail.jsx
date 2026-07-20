import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEvent = useCallback(async () => {
    try {
      const data = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  async function handleBook() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "user") {
      setError("Only customers can book tickets");
      return;
    }

    setBooking(true);
    setError("");
    try {
      await api.post("/tickets/book", { eventId: parseInt(id), quantity: 1 });
      setMessage("Ticket booked successfully! Check your bookings.");
      loadEvent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <div className="loading">Loading event...</div>;
  if (!event) return <div className="error">Event not found</div>;

  const remaining = event.capacity - (event.ticketsSold || 0);

  return (
    <div className="page event-detail">
      {event.photo && <img src={event.photo} alt={event.title} className="event-detail-img" />}

      <div className="event-detail-content">
        <h1>{event.title}</h1>
        <span className={`status-badge status-${event.status.toLowerCase()}`}>{event.status}</span>

        <div className="event-info">
          <p><strong>Category:</strong> {event.category}</p>
          <p><strong>Location:</strong> {event.location}</p>
          <p><strong>Dates:</strong> {event.startDate} - {event.endDate}</p>
          <p><strong>Price:</strong> {event.price === 0 ? "Free" : `ETB ${event.price}`}</p>
          <p><strong>Capacity:</strong> {remaining} remaining ({event.ticketsSold || 0} sold / {event.capacity} total)</p>
          <p><strong>Organized by:</strong> {event.organizerName}</p>
        </div>

        {event.description && (
          <div className="event-description">
            <h3>Description</h3>
            <p>{event.description}</p>
          </div>
        )}

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {user && user.role === "user" && (
          <button
            onClick={handleBook}
            className="btn btn-primary btn-lg"
            disabled={booking || remaining <= 0}
          >
            {booking ? "Booking..." : remaining <= 0 ? "Sold Out" : "Book Ticket"}
          </button>
        )}

        {!user && (
          <button onClick={() => navigate("/login")} className="btn btn-primary btn-lg">
            Login to Book
          </button>
        )}
      </div>
    </div>
  );
}
