import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { getCategoryMeta } from "../utils/categories";

const MOCK_EVENTS = [
  { id: 1, title: "Coachella Valley Music Festival", category: "Concert", location: "Indio, California", price: 250, startDate: "11-04-2025", endDate: "20-04-2025", photo: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80", description: "The world-famous Coachella Valley Music and Arts Festival returns with an incredible lineup of artists across multiple stages in the desert.", status: "Approved", capacity: 125000, ticketsSold: 98000, organizerName: "Goldenvoice" },
  { id: 2, title: "Tomorrowland Winter", category: "Concert", location: "Alpe d'Huez, France", price: 350, startDate: "15-03-2025", endDate: "22-03-2025", photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80", description: "Experience the magic of Tomorrowland in the French Alps. Three stages, world-class DJs, and breathtaking mountain views.", status: "Approved", capacity: 25000, ticketsSold: 22500, organizerName: "Tomorrowland" },
  { id: 3, title: "Web Summit 2025", category: "Conference", location: "Lisbon, Portugal", price: 850, startDate: "10-11-2025", endDate: "13-11-2025", photo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80", description: "The world's largest technology conference. 70,000+ attendees, 2,600+ startups, and speakers from Google, Meta, and OpenAI.", status: "Approved", capacity: 70000, ticketsSold: 54000, organizerName: "Web Summit Ltd" },
  { id: 4, title: "TED Conference 2025", category: "Seminar", location: "Vancouver, Canada", price: 1200, startDate: "14-04-2025", endDate: "18-04-2025", photo: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80", description: "Ideas worth spreading. Join the world's leading thinkers and doers for five days of talks, workshops, and unforgettable experiences.", status: "Approved", capacity: 1800, ticketsSold: 1750, organizerName: "TED Conferences" },
  { id: 5, title: "UFC 310 Championship", category: "Sports", location: "Las Vegas, Nevada", price: 500, startDate: "20-12-2025", endDate: "20-12-2025", photo: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80", description: "The biggest UFC event of the year. Championship fights, undercard battles, and an electric atmosphere at the T-Mobile Arena.", status: "Approved", capacity: 20000, ticketsSold: 18500, organizerName: "UFC" },
  { id: 6, title: "Art Basel Miami Beach", category: "Exhibition", location: "Miami Beach, Florida", price: 75, startDate: "04-12-2025", endDate: "07-12-2025", photo: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=800&q=80", description: "The premier international art fair for modern and contemporary works. Over 4,000 artists and 270 galleries from around the world.", status: "Approved", capacity: 80000, ticketsSold: 62000, organizerName: "Art Basel" },
  { id: 7, title: "Google I/O Developer Conference", category: "Workshop", location: "Mountain View, California", price: 0, startDate: "20-05-2025", endDate: "21-05-2025", photo: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80", description: "Join Google developers for two days of hands-on workshops, technical talks, and the latest in AI, Android, and cloud technology.", status: "Approved", capacity: 5000, ticketsSold: 4800, organizerName: "Google" },
  { id: 8, title: "Burning Man 2025", category: "General", location: "Black Rock Desert, Nevada", price: 575, startDate: "24-08-2025", endDate: "01-09-2025", photo: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80", description: "A week-long experiment in community and art. Radical self-expression, art installations, and the iconic Man burn in the Nevada desert.", status: "Approved", capacity: 80000, ticketsSold: 72000, organizerName: "Burning Man Project" },
  { id: 9, title: "Cannes Lions Festival", category: "Networking", location: "Cannes, France", price: 650, startDate: "16-06-2025", endDate: "20-06-2025", photo: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80", description: "The global festival of creativity. Celebrating the best in advertising, branding, and creative communications on the French Riviera.", status: "Approved", capacity: 15000, ticketsSold: 13200, organizerName: "Cannes Lions" },
  { id: 10, title: "Glastonbury Festival", category: "Concert", location: "Somerset, England", price: 340, startDate: "25-06-2025", endDate: "29-06-2025", photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80", description: "The largest greenfield music and performing arts festival in the world. Five days of music, theatre, comedy, and circus on Worthy Farm.", status: "Approved", capacity: 210000, ticketsSold: 210000, organizerName: "Glastonbury Festivals" },
  { id: 11, title: "CES 2025", category: "Conference", location: "Las Vegas, Nevada", price: 300, startDate: "07-01-2025", endDate: "10-01-2025", photo: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80", description: "The world's most influential tech event. 4,500+ exhibitors showcasing the latest in AI, robotics, smart homes, and mobility.", status: "Approved", capacity: 130000, ticketsSold: 115000, organizerName: "Consumer Technology Association" },
  { id: 12, title: "Sundance Film Festival", category: "Exhibition", location: "Park City, Utah", price: 40, startDate: "23-01-2025", endDate: "02-02-2025", photo: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80", description: "The ultimate showcase of independent cinema. Premieres, documentaries, shorts, and panels from visionary filmmakers around the globe.", status: "Approved", capacity: 46000, ticketsSold: 38000, organizerName: "Sundance Institute" },
];

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
    } catch {
      const found = MOCK_EVENTS.find((e) => e.id === parseInt(id));
      if (found) setEvent(found);
      else setError("Event not found");
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

  if (loading) {
    return (
      <div className="event-detail">
        <div style={{ height: 400, borderRadius: 24, background: "rgba(20,20,40,0.5)", animation: "m2Shimmer 1.5s infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)" }} />
      </div>
    );
  }
  if (!event) return <div className="error">Event not found</div>;

  const meta = getCategoryMeta(event.category);
  const remaining = event.capacity - (event.ticketsSold || 0);
  const soldPercent = Math.round(((event.ticketsSold || 0) / event.capacity) * 100);

  return (
    <div className="event-detail">
      <div className="event-detail-hero">
        <img
          src={event.photo || meta.image}
          alt={event.title}
        />
        <div className="event-detail-hero-overlay" />
        <div className="event-detail-hero-badge">
          <span className={`status-badge status-${event.status.toLowerCase()}`}>{event.status}</span>
        </div>
        <div className="event-detail-hero-price">
          {event.price === 0 ? "Free" : `ETB ${event.price}`}
        </div>
      </div>

      <div className="event-detail-content">
        <h1>{event.title}</h1>

        <div className="event-info">
          <div className="event-info-item">
            <label>Category</label>
            <span>{meta.icon} {event.category}</span>
          </div>
          <div className="event-info-item">
            <label>Location</label>
            <span>{event.location}</span>
          </div>
          <div className="event-info-item">
            <label>Dates</label>
            <span>{event.startDate} — {event.endDate}</span>
          </div>
          <div className="event-info-item">
            <label>Organizer</label>
            <span>{event.organizerName}</span>
          </div>
          <div className="event-info-item">
            <label>Capacity</label>
            <span>{remaining} remaining</span>
          </div>
          <div className="event-info-item">
            <label>Tickets Sold</label>
            <span>{event.ticketsSold || 0} / {event.capacity}</span>
          </div>
        </div>

        {event.description && (
          <div className="event-description">
            <h3>About this event</h3>
            <p>{event.description}</p>
          </div>
        )}

        <div className="event-capacity-bar">
          <div className="capacity-track">
            <div className="capacity-fill" style={{ width: `${soldPercent}%` }} />
          </div>
          <div className="capacity-text">{soldPercent}% of tickets sold</div>
        </div>

        {message && <div className="success" style={{ marginTop: 16 }}>{message}</div>}
        {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

        <div className="event-book-section">
          {user && user.role === "user" && (
            <button
              onClick={handleBook}
              className="btn-book"
              disabled={booking || remaining <= 0}
            >
              {booking ? "Booking..." : remaining <= 0 ? "Sold Out" : "Book Ticket Now"}
            </button>
          )}

          {!user && (
            <button onClick={() => navigate("/login")} className="btn-book">
              Login to Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
