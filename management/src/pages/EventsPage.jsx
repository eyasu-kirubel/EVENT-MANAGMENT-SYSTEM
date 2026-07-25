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
  const [bookingStep, setBookingStep] = useState("form");
  const [paymentForm, setPaymentForm] = useState({ cardNumber: "", name: "", expiry: "", cvv: "" });
  const [paymentError, setPaymentError] = useState("");
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
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        e.location.toLowerCase().includes(s) ||
        e.category.toLowerCase().includes(s)
      );
    }
    setFilteredEvents(result);
  }, [search, selectedCategory, events]);

  const categories = ["All", ...new Set(events.map((e) => e.category))];

  const openBooking = (event) => {
    if (!user) { navigate("/login"); return; }
    setBookingEvent(event);
    setBookingQty(1);
    setBookingStep("form");
    setPaymentForm({ cardNumber: "", name: "", expiry: "", cvv: "" });
    setPaymentError("");
  };

  const handlePayment = async () => {
    setPaymentError("");
    const { cardNumber, name, expiry, cvv } = paymentForm;
    if (!cardNumber || !name || !expiry || !cvv) {
      setPaymentError("All payment fields are required");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      setPaymentError("Invalid card number");
      return;
    }
    if (cvv.length < 3) {
      setPaymentError("Invalid CVV");
      return;
    }
    setBookingStep("processing");
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, eventId: bookingEvent.id, quantity: bookingQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmedBooking({ ...data.booking, eventTitle: bookingEvent.title, eventLocation: bookingEvent.location });
      setBookingStep("confirmed");
    } catch (err) {
      setPaymentError(err.message);
      setBookingStep("form");
    }
  };

  const handleDownloadQR = () => {
    if (!confirmedBooking?.qrcode) return;
    const link = document.createElement("a");
    link.href = confirmedBooking.qrcode;
    link.download = `ticket-${confirmedBooking.eventTitle?.replace(/\s+/g, "-")}-#${confirmedBooking.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const closeBooking = () => {
    setBookingEvent(null);
    setConfirmedBooking(null);
    setBookingStep("form");
    setPaymentError("");
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

      {/* SEARCH & FILTERS */}
      <div style={styles.filters}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search events, locations, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch("")} style={styles.clearBtn}>✕</button>
          )}
        </div>
        <div style={styles.categoryFilters}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.catBtn,
                background: selectedCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                color: selectedCategory === cat ? 'white' : 'var(--text-muted)',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <p style={styles.resultCount}>{filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found</p>
      </div>

      {/* EVENTS GRID */}
      {loading ? (
        <div style={styles.loading}>Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 48 }}>🔍</span>
          <h3 style={{ color: 'white', margin: '12px 0 4px' }}>No events found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Try adjusting your search or filters</p>
        </div>
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
                <div style={styles.capacityBadge}>{event.capacity} seats</div>
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
                  <button onClick={() => openBooking(event)} style={styles.bookBtn}>Book Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOOKING + PAYMENT MODAL */}
      {bookingEvent && !confirmedBooking && (
        <div style={styles.modalOverlay} onClick={closeBooking}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeBooking} style={styles.modalClose}>✕</button>

            {bookingStep === "form" && (
              <>
                <h2 style={styles.modalTitle}>Book Tickets</h2>
                <div style={styles.modalEventInfo}>
                  <img src={bookingEvent.image} alt="" style={styles.modalImage} />
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

                <div style={styles.paymentSection}>
                  <h3 style={styles.paymentTitle}>💳 Payment Details</h3>
                  <div style={styles.formField}>
                    <label style={styles.label}>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={paymentForm.cardNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: formatCardNumber(e.target.value) })}
                      style={styles.input}
                      maxLength={19}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={paymentForm.name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ ...styles.formField, flex: 1 }}>
                      <label style={styles.label}>Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={paymentForm.expiry}
                        onChange={(e) => setPaymentForm({ ...paymentForm, expiry: formatExpiry(e.target.value) })}
                        style={styles.input}
                        maxLength={5}
                      />
                    </div>
                    <div style={{ ...styles.formField, flex: 1 }}>
                      <label style={styles.label}>CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={paymentForm.cvv}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        style={styles.input}
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>

                {paymentError && (
                  <div style={styles.errorMsg}>{paymentError}</div>
                )}

                <button onClick={handlePayment} style={styles.payBtn}>
                  Pay ETB {(bookingEvent.price * bookingQty).toLocaleString()} →
                </button>
              </>
            )}

            {bookingStep === "processing" && (
              <div style={styles.processing}>
                <div style={styles.processingSpinner} />
                <h3 style={{ color: 'white', margin: '16px 0 4px' }}>Processing Payment...</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Please do not close this window</p>
                <div style={styles.processingDetails}>
                  <span>ETB {(bookingEvent.price * bookingQty).toLocaleString()}</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>{bookingEvent.title}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMED + QR MODAL */}
      {confirmedBooking && (
        <div style={styles.modalOverlay} onClick={closeBooking}>
          <div style={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.qrTicketHeader}>
              <span style={{ fontSize: 28 }}>🎉</span>
              <h2 style={styles.qrModalTitle}>Payment Successful!</h2>
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
            <div style={{ padding: '0 24px 8px' }}>
              <button onClick={handleDownloadQR} style={styles.downloadBtn}>⬇ Download QR Code</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <button onClick={closeBooking} style={styles.payBtn}>Done</button>
            </div>
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

  filters: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 24px' },
  searchWrap: { position: 'relative', marginBottom: 14 },
  searchIcon: { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 },
  searchInput: { width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 44px 14px 44px', color: 'white', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s, background 0.2s' },
  clearBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.5)', width: 28, height: 28, borderRadius: '50%', fontSize: '12px', cursor: 'pointer' },
  categoryFilters: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  catBtn: { border: '1px solid rgba(255,255,255,0.08)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  resultCount: { marginTop: 12, fontSize: '13px', color: 'rgba(255,255,255,0.4)' },

  loading: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '16px' },
  emptyState: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '16px' },

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
  modal: { background: 'rgba(20,15,35,0.98)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' },
  modalClose: { position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', fontSize: '14px', cursor: 'pointer', zIndex: 2 },
  modalTitle: { fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: 20 },
  modalEventInfo: { display: 'flex', gap: 14, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12 },
  modalImage: { width: 100, height: 70, borderRadius: 8, objectFit: 'cover' },
  modalEventTitle: { fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: 4 },
  modalEventMeta: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: 2 },
  modalPrice: { fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)', marginTop: 4 },
  qtyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qtyLabel: { fontSize: '14px', color: 'var(--text-muted)' },
  qtyControls: { display: 'flex', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px', cursor: 'pointer' },
  qtyValue: { fontSize: '18px', fontWeight: 'bold', color: 'white', minWidth: 24, textAlign: 'center' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '16px', color: 'white', marginBottom: 8 },
  totalPrice: { fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' },

  paymentSection: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginTop: 8 },
  paymentTitle: { fontSize: '15px', fontWeight: 'bold', color: 'white', marginBottom: 14 },
  formField: { marginBottom: 12 },
  label: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  errorMsg: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: 12 },
  payBtn: { width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },

  processing: { textAlign: 'center', padding: '30px 0' },
  processingSpinner: { width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
  processingDetails: { display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16, fontSize: '13px', color: 'rgba(255,255,255,0.4)' },

  downloadBtn: { width: '100%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: 8 },

  qrModal: { background: 'rgba(20,15,35,0.98)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: 400, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden' },
  qrTicketHeader: { background: 'linear-gradient(135deg, #059669, #10b981)', padding: '28px 24px', textAlign: 'center' },
  qrModalTitle: { fontSize: '22px', fontWeight: 'bold', color: 'white', margin: '8px 0 4px' },
  qrModalSubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 },
  qrDisplay: { background: 'white', margin: '20px 24px', borderRadius: 14, padding: '20px', textAlign: 'center' },
  qrBigImage: { width: 180, height: 180, display: 'block', margin: '0 auto 10px', borderRadius: 10 },
  qrScanLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 500 },
  qrDetails: { padding: '0 24px 16px' },
  qrDetailRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  qrDetailIcon: { fontSize: '14px', width: 24 },
  qrDetailLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', width: 60 },
  qrDetailValue: { fontSize: '13px', color: 'white', fontWeight: 500, flex: 1 },
};
