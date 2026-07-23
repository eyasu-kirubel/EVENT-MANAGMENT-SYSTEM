import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [bookingEvent, setBookingEvent] = useState(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [bookingMsg, setBookingMsg] = useState({ type: "", text: "" });
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setFilteredEvents(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = events;
    if (selectedCategory !== "All") {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(s) || e.description.toLowerCase().includes(s) || e.location.toLowerCase().includes(s)
      );
    }
    setFilteredEvents(result);
  }, [search, selectedCategory, events]);

  const categories = ["All", ...new Set(events.map((e) => e.category))];

  const handleBook = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBookingMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, eventId: bookingEvent.id, quantity: bookingQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmedBooking({ ...data.booking, eventTitle: bookingEvent.title, eventLocation: bookingEvent.location });
      setBookingMsg({ type: "success", text: "Booking confirmed!" });
    } catch (err) {
      setBookingMsg({ type: "error", text: err.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <span onClick={() => navigate("/")} style={styles.logo}>🎪 EventHub</span>
          <div style={styles.navLinks}>
            <a onClick={() => navigate("/")} style={styles.navLink}>Home</a>
            <a onClick={() => navigate("/events")} style={{ ...styles.navLink, color: 'var(--primary-light)' }}>Events</a>
            {user ? (
              <>
                <span style={styles.userBadge}>👤 {user.fullname}</span>
                <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
              </>
            ) : (
              <>
                <a onClick={() => navigate("/login")} style={styles.navLink}>Login</a>
                <button onClick={() => navigate("/register")} style={styles.navBtn}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Upcoming Events</h1>
        <p style={styles.headerSub}>Find and book tickets for the best events in Addis Ababa</p>
      </div>

      {/* FILTERS */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.categoryFilters}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.catBtn,
                background: selectedCategory === cat ? 'var(--primary)' : 'var(--bg-card)',
                color: selectedCategory === cat ? 'white' : 'var(--text-muted)',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* EVENTS GRID */}
      {loading ? (
        <div style={styles.loading}>Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div style={styles.empty}>No events found matching your criteria.</div>
      ) : (
        <div style={styles.grid}>
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              style={styles.card}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(124,58,237,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={styles.cardImage}>
                <img src={event.image} alt={event.title} style={styles.cardImg} />
                <span style={styles.cardCategory}>{event.category}</span>
                <div style={styles.capacityBadge}>
                  {event.capacity} seats
                </div>
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{event.title}</h3>
                <p style={styles.cardDesc}>{event.description}</p>
                <div style={styles.cardMeta}>
                  <span>📍 {event.location}</span>
                  <span>📅 {event.startDate}{event.startDate !== event.endDate ? ` - ${event.endDate}` : ""}</span>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.price}>ETB {event.price.toLocaleString()}</span>
                  <button
                    onClick={() => {
                      if (!user) { navigate("/login"); return; }
                      setBookingEvent(event);
                      setBookingQty(1);
                    }}
                    style={styles.bookBtn}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOOKING MODAL — Show QR directly after confirmation */}
      {bookingEvent && !confirmedBooking && (
        <div style={styles.modalOverlay} onClick={() => setBookingEvent(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setBookingEvent(null)} style={styles.modalClose}>✕</button>
            <h2 style={styles.modalTitle}>Book Tickets</h2>
            <div style={styles.modalEventInfo}>
              <img src={bookingEvent.image} alt={bookingEvent.title} style={styles.modalImage} />
              <div>
                <h3 style={styles.modalEventTitle}>{bookingEvent.title}</h3>
                <p style={styles.modalEventMeta}>📍 {bookingEvent.location}</p>
                <p style={styles.modalEventMeta}>📅 {bookingEvent.startDate}</p>
                <p style={styles.modalPrice}>ETB {bookingEvent.price.toLocaleString()} per ticket</p>
              </div>
            </div>
            <div style={styles.qtyRow}>
              <label style={styles.qtyLabel}>Quantity:</label>
              <div style={styles.qtyControls}>
                <button onClick={() => setBookingQty(Math.max(1, bookingQty - 1))} style={styles.qtyBtn}>-</button>
                <span style={styles.qtyValue}>{bookingQty}</span>
                <button onClick={() => setBookingQty(bookingQty + 1)} style={styles.qtyBtn}>+</button>
              </div>
            </div>
            <div style={styles.totalRow}>
              <span>Total:</span>
              <span style={styles.totalPrice}>ETB {(bookingEvent.price * bookingQty).toLocaleString()}</span>
            </div>
            {bookingMsg.text && (
              <div style={{
                ...styles.bookingMsg,
                background: 'rgba(239,68,68,0.1)',
                borderColor: 'rgba(239,68,68,0.2)',
                color: '#fca5a5',
              }}>
                {bookingMsg.text}
              </div>
            )}
            <button onClick={handleBook} style={styles.confirmBtn}>
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* QR CODE MODAL — Displayed directly after booking */}
      {confirmedBooking && (
        <div style={styles.modalOverlay} onClick={() => { setConfirmedBooking(null); setBookingEvent(null); setBookingMsg({ type: "", text: "" }); }}>
          <div style={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.qrTicketHeader}>
              <span style={{ fontSize: 28 }}>🎉</span>
              <h2 style={styles.qrModalTitle}>Booking Confirmed!</h2>
              <p style={styles.qrModalSubtitle}>Your ticket QR code</p>
            </div>
            {confirmedBooking.qrcode && (
              <div style={styles.qrDisplay}>
                <img src={confirmedBooking.qrcode} alt="Ticket QR Code" style={styles.qrBigImage} />
                <span style={styles.qrScanLabel}>Show this at the entrance</span>
              </div>
            )}
            <div style={styles.qrDetails}>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrDetailIcon}>🎪</span>
                <span style={styles.qrDetailLabel}>Event</span>
                <span style={styles.qrDetailValue}>{confirmedBooking.eventTitle}</span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrDetailIcon}>📍</span>
                <span style={styles.qrDetailLabel}>Location</span>
                <span style={styles.qrDetailValue}>{confirmedBooking.eventLocation}</span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrDetailIcon}>🎟️</span>
                <span style={styles.qrDetailLabel}>Tickets</span>
                <span style={styles.qrDetailValue}>{confirmedBooking.quantity}</span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrDetailIcon}>🆔</span>
                <span style={styles.qrDetailLabel}>Booking</span>
                <span style={styles.qrDetailValue}>#{confirmedBooking.id}</span>
              </div>
            </div>
            <button
              onClick={() => { setConfirmedBooking(null); setBookingEvent(null); setBookingMsg({ type: "", text: "" }); }}
              style={styles.confirmBtn}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-dark)' },
  navbar: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,10,26,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' },
  navContent: { maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '20px', fontWeight: 'bold', color: 'white', cursor: 'pointer' },
  navLinks: { display: 'flex', gap: '20px', alignItems: 'center' },
  navLink: { color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' },
  navBtn: { background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  userBadge: { color: 'var(--text-muted)', fontSize: '14px' },
  logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },

  header: { textAlign: 'center', padding: '60px 24px 20px' },
  headerTitle: { fontSize: '40px', fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSub: { fontSize: '16px', color: 'var(--text-muted)' },

  filters: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px' },
  searchInput: { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 18px', color: 'white', fontSize: '15px', outline: 'none', marginBottom: 16 },
  categoryFilters: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  catBtn: { border: '1px solid var(--border)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },

  loading: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '16px' },
  empty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '16px' },

  grid: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'all 0.3s ease' },
  cardImage: { position: 'relative', height: 200 },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardCategory: { position: 'absolute', top: 12, left: 12, background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  capacityBadge: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', backdropFilter: 'blur(4px)' },
  cardBody: { padding: 20 },
  cardTitle: { fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 8 },
  cardDesc: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' },
  bookBtn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 },
  modal: { background: 'rgba(20,15,35,0.98)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' },
  modalClose: { position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', fontSize: '14px', cursor: 'pointer' },
  modalTitle: { fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: 20 },
  modalEventInfo: { display: 'flex', gap: 16, marginBottom: 24 },
  modalImage: { width: 120, height: 80, borderRadius: 8, objectFit: 'cover' },
  modalEventTitle: { fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: 4 },
  modalEventMeta: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: 2 },
  modalPrice: { fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)', marginTop: 4 },
  qtyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  qtyLabel: { fontSize: '14px', color: 'var(--text-muted)' },
  qtyControls: { display: 'flex', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'white', fontSize: '16px', cursor: 'pointer' },
  qtyValue: { fontSize: '18px', fontWeight: 'bold', color: 'white', minWidth: 24, textAlign: 'center' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--border)', fontSize: '16px', color: 'white', marginBottom: 16 },
  totalPrice: { fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' },
  bookingMsg: { padding: '10px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: 16, border: '1px solid' },
  confirmBtn: { width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },

  qrModal: { background: 'rgba(20,15,35,0.98)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: 400, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden' },
  qrTicketHeader: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', padding: '28px 24px', textAlign: 'center' },
  qrModalTitle: { fontSize: '22px', fontWeight: 'bold', color: 'white', margin: '8px 0 4px' },
  qrModalSubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 },
  qrDisplay: { background: 'white', margin: '20px 24px', borderRadius: 14, padding: '20px', textAlign: 'center' },
  qrBigImage: { width: 180, height: 180, display: 'block', margin: '0 auto 10px', borderRadius: 10 },
  qrScanLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 500 },
  qrDetails: { padding: '0 24px 20px' },
  qrDetailRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  qrDetailIcon: { fontSize: '14px', width: 24 },
  qrDetailLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', width: 60 },
  qrDetailValue: { fontSize: '13px', color: 'white', fontWeight: 500, flex: 1 },
};
