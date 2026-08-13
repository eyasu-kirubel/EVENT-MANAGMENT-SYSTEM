import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { CATEGORY_ICONS } from "../constants/categories";

const PAYMENT_METHODS = [
  { id: "telebirr", name: "Telebirr", icon: "📱", color: "#00a651", placeholder: "09XXXXXXXX", hint: "Ethio Telecom number" },
  { id: "cbe", name: "CBE Birr", icon: "🏦", color: "#003da5", placeholder: "1000XXXXXXXXX", hint: "13-digit account number" },
  { id: "mpesa", name: "M-PESA", icon: "💳", color: "#e3002b", placeholder: "07XXXXXXXX", hint: "Safaricom number" },
];

function getPayeeAccounts(event) {
  if (!event) return [];
  const accounts = Array.isArray(event.paymentAccounts)
    ? event.paymentAccounts
    : event.paymentAccount
      ? [{ method: "telebirr", number: event.paymentAccount }]
      : [];
  return accounts.filter((a) => a && a.method && a.number);
}

const CATEGORY_ICONS_FALLBACK = "\u2728";

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [tierName, setTierName] = useState("General");
  const [step, setStep] = useState("details");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const [bookedBookingId, setBookedBookingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEvent = useCallback(async () => {
    try {
      const data = await api.get(`/events/${id}`);
      setEvent(data);
      if (data.tickets && data.tickets.length > 0) {
        setTierName(data.tickets[0].ticketType);
      } else if (data.ticketTiers && data.ticketTiers.length > 0) {
        setTierName(data.ticketTiers[0].name);
      } else {
        setTierName("General");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  function handleStartBooking() {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "user") { setError("Only customers can book tickets"); return; }
    if (quantity < 1) { setError("Select at least 1 ticket"); return; }
    setError("");
    setStep("payment");
  }

  function handlePay() {
    if (!paymentMethod) { setError("Select a payment method"); return; }
    const payee = getPayeeAccounts(event).find((a) => a.method === paymentMethod);
    if (!payee) {
      setError(`Organizer has no ${PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.name} account — pick another method.`);
      return;
    }
    setError("");
    setStep("processing");
    setProcessing(true);

    setTimeout(async () => {
      try {
        const data = await api.post("/tickets/book", {
          eventId: parseInt(id),
          quantity,
          ticketId: activeTier && activeTier.id ? activeTier.id : null,
          tier: tierName,
          paymentMethod,
          paidTo: payee.number,
        });
        setBookedBookingId(data.bookingId);
        setMessage("Payment successful! Your ticket is confirmed.");
        setStep("success");
        loadEvent();
      } catch (err) {
        setError(err.message);
        setStep("payment");
      } finally {
        setProcessing(false);
      }
    }, 2500);
  }

  function downloadQR() {
    const token = localStorage.getItem("token");
    fetch(`/api/tickets/${bookedBookingId}/qr`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.text())
      .then((qrSvg) => {
        const ticketSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="520" viewBox="0 0 350 520">
  <defs>
    <clipPath id="ticketClip"><rect width="350" height="520" rx="18" /></clipPath>
  </defs>
  <g clip-path="url(#ticketClip)">
    <rect width="350" height="520" fill="#fff" />
    <rect width="350" height="140" fill="url(#ticketBg)" />
    <defs><linearGradient id="ticketBg" x1="0" y1="0" x2="350" y2="140" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#6c5ce7"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>
    <text x="175" y="55" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">EVENT TICKET</text>
    <text x="175" y="90" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="18" font-weight="800">${event.title.replace(/&/g,"&amp;").replace(/</g,"&lt;").substring(0,30)}</text>
    <text x="175" y="118" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial,sans-serif" font-size="11">Ticket #${bookedBookingId}</text>
    <circle cx="175" cy="140" r="18" fill="#fff"/>
    <circle cx="175" cy="140" r="18" fill="url(#ticketBg)" />
    <rect x="0" y="140" width="350" height="2" fill="#fff" stroke-dasharray="8,6" stroke="#e9ecef" stroke-width="2" />
    <g transform="translate(50, 170) scale(0.66)">
      ${qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}
    </g>
    <line x1="30" y1="400" x2="320" y2="400" stroke="#e9ecef" stroke-width="1.5" stroke-dasharray="6,4" />
    <text x="30" y="430" fill="#999" font-family="Arial,sans-serif" font-size="11">Location</text>
    <text x="30" y="448" fill="#333" font-family="Arial,sans-serif" font-size="13" font-weight="700">${event.location.replace(/&/g,"&amp;").replace(/</g,"&lt;").substring(0,35)}</text>
    <text x="30" y="475" fill="#999" font-family="Arial,sans-serif" font-size="11">Date</text>
    <text x="30" y="493" fill="#333" font-family="Arial,sans-serif" font-size="13" font-weight="700">${new Date(event.startDate).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</text>
    <text x="200" y="475" fill="#999" font-family="Arial,sans-serif" font-size="11">Quantity</text>
    <text x="200" y="493" fill="#333" font-family="Arial,sans-serif" font-size="13" font-weight="700">${quantity}x</text>
  </g>
</svg>`;
        const blob = new Blob([ticketSvg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ticket-${bookedBookingId}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) return <div className="loading">Loading event...</div>;
  if (!event) return <div className="error">Event not found</div>;

  const remaining = event.capacity - (event.ticketsSold || 0);
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const legacyTiers = Array.isArray(event.ticketTiers) ? event.ticketTiers : [];
  const hasTickets = tickets.length > 0;
  const hasTiers = hasTickets || legacyTiers.length > 0;
  const tiers = hasTickets
    ? tickets.map((t) => {
        const tRem = Math.max(0, (Number(t.quantity) || 0) - (Number(t.soldQuantity) || 0));
        return { id: t.id, name: t.ticketType, price: Number(t.price) || 0, remaining: tRem, soldOut: tRem <= 0, description: t.description || "" };
      })
    : legacyTiers.map((t) => {
        const tRem = Math.max(0, Number(t.capacity) - ((event.tierSales && event.tierSales[t.name]) || 0));
        return { id: null, name: t.name, price: Number(t.price) || 0, remaining: tRem, soldOut: tRem <= 0, description: t.description || "" };
      });
  const activeTier = hasTiers ? (tiers.find((t) => t.name === tierName) || tiers[0]) : null;
  const unitPrice = activeTier ? activeTier.price : event.price;
  const tierRemaining = activeTier ? activeTier.remaining : remaining;
  const maxQty = hasTiers ? tierRemaining : remaining;
  const totalPrice = unitPrice * quantity;
  const soldPercent = event.capacity > 0 ? ((event.ticketsSold || 0) / event.capacity) * 100 : 0;
  const minTierPrice = hasTiers ? Math.min(...tiers.map((t) => t.price)) : event.price;

  return (
    <div className="ev-detail">
      <Link to="/events" className="admin-back">← Back to Dashboard</Link>

      {/* Hero */}
      <div className="ev-hero">
        {event.photo ? (
          <img src={event.photo} alt={event.title} className="ev-hero-img" />
        ) : (
          <div className="ev-hero-placeholder">
            <span>{CATEGORY_ICONS[event.category] || "\u2728"}</span>
          </div>
        )}
        <div className="ev-hero-overlay" />
        <div className="ev-hero-content">
          <span className="ev-hero-category">{CATEGORY_ICONS[event.category] || "\u2728"} {event.category}</span>
          <h1 className="ev-hero-title">{event.title}</h1>
          <div className="ev-hero-price">
            {hasTiers
              ? (minTierPrice === 0 ? "Free" : `From ETB ${minTierPrice}`)
              : (event.price === 0 ? "Free" : `ETB ${event.price}`)}
          </div>
        </div>
      </div>

      <div className="ev-body">
        {/* Info Cards */}
        <div className="ev-info-grid">
          <div className="ev-info-card">
            <div className="ev-info-icon">📍</div>
            <div><span className="ev-info-label">Location</span><span className="ev-info-value">{event.location}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon">📅</div>
            <div><span className="ev-info-label">Start Date</span><span className="ev-info-value">{event.startDate}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon">🗓</div>
            <div><span className="ev-info-label">End Date</span><span className="ev-info-value">{event.endDate}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon">👤</div>
            <div><span className="ev-info-label">Organizer</span><span className="ev-info-value">{event.organizerName}</span></div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="ev-capacity-section">
          <div className="ev-capacity-header">
            <span>Capacity</span>
            <span>{event.ticketsSold || 0} / {event.capacity} booked</span>
          </div>
          <div className="ev-capacity-bar">
            <div className="ev-capacity-fill" style={{ width: `${soldPercent}%` }} />
          </div>
          <div className="ev-capacity-footer">
            <span className={`ev-remaining ${remaining <= 5 ? "low" : ""}`}>{remaining} spots left</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="ev-description">
            <h3>About this event</h3>
            <p>{event.description}</p>
          </div>
        )}

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* STEP: Details — quantity + book */}
        {step === "details" && user && user.role === "user" && maxQty > 0 && (
          <div className="ev-booking-section">
            <h3>Get Tickets</h3>
            {hasTiers && (
              <div className="ev-tier-picker">
                <span className="ev-qty-label">Select section</span>
                <div className="ev-tier-options">
                  {tiers.map((t) => (
                    <button key={t.name} type="button"
                      className={`ev-tier-card ${tierName === t.name ? "selected" : ""} ${t.soldOut ? "sold-out" : ""}`}
                      onClick={() => { if (!t.soldOut) { setTierName(t.name); setQuantity(1); } }}
                      disabled={t.soldOut}
                    >
                      <span className="ev-tier-name">{t.name}</span>
                      {t.description && <span className="ev-tier-desc">{t.description}</span>}
                      <span className="ev-tier-price">{t.price === 0 ? "Free" : `ETB ${t.price}`}</span>
                      <span className="ev-tier-left">{t.soldOut ? "Sold out" : `${t.remaining} left`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="ev-quantity-row">
              <span className="ev-qty-label">Number of tickets</span>
              <div className="ev-quantity-controls">
                <button type="button" className="ev-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 9H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                <span className="ev-qty-value">{quantity}</span>
                <button type="button" className="ev-qty-btn" onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 9H14M9 4V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="ev-booking-summary">
              <div className="ev-summary-row">
                <span>{quantity}x {hasTiers ? `${activeTier.name} — ` : ""}{event.title}</span>
                <span>ETB {(unitPrice * quantity).toFixed(2)}</span>
              </div>
              <div className="ev-summary-row ev-summary-total">
                <span>Total</span>
                <span>ETB {totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleStartBooking} className="ev-book-btn">
              Book Now — ETB {totalPrice.toFixed(2)}
            </button>
          </div>
        )}

        {step === "details" && user && user.role === "user" && maxQty <= 0 && (
          <div className="ev-booking-section ev-sold-out">
            <h3>Sold Out</h3>
            <p>This event has no more available tickets.</p>
          </div>
        )}

        {step === "details" && !user && (
          <div className="ev-booking-section">
            <p>Sign in to book tickets for this event.</p>
            <button onClick={() => navigate("/login")} className="ev-book-btn">Sign In to Book</button>
          </div>
        )}

        {/* STEP: Payment */}
        {step === "payment" && (() => {
          const payeeAccounts = getPayeeAccounts(event);
          const payee = payeeAccounts.find((a) => a.method === paymentMethod);
          return (
          <div className="ev-booking-section ev-payment">
            <h3>Payment</h3>
            <div className="ev-payment-methods">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm.id} type="button"
                  className={`ev-payment-card ${paymentMethod === pm.id ? "selected" : ""} ${!payeeAccounts.some((a) => a.method === pm.id) ? "ev-pm-missing" : ""}`}
                  onClick={() => { setPaymentMethod(pm.id); setError(""); }}
                  style={{ "--pm-color": pm.color }}
                >
                  <span className="ev-pm-icon">{pm.icon}</span>
                  <span className="ev-pm-name">{pm.name}</span>
                  {!payeeAccounts.some((a) => a.method === pm.id) && (
                    <span className="ev-pm-unavailable">not available</span>
                  )}
                </button>
              ))}
            </div>
            {paymentMethod && (() => {
              const pm = PAYMENT_METHODS.find(p => p.id === paymentMethod);
              return (
                <>
                  {payee ? (
                    <div className="ev-payment-payto">
                      <span className="ev-payto-label">Pay to {pm.name}</span>
                      <span className="ev-payto-account">{payee.number}</span>
                    </div>
                  ) : (
                    <div className="ev-payment-payto ev-payto-missing">
                      <span className="ev-payto-label">Organizer has no {pm.name} account</span>
                      <span className="ev-payto-account">Pick another method.</span>
                    </div>
                  )}
                </>
              );
            })()}
            {error && <div className="field-error" style={{ marginTop: 8, marginBottom: 4, fontSize: '0.85rem' }}>{error}</div>}
            <div className="ev-booking-summary">
              {hasTiers && (
                <div className="ev-summary-row">
                  <span>Section</span>
                  <span>{activeTier.name}</span>
                </div>
              )}
              <div className="ev-summary-row ev-summary-total">
                <span>Total ({quantity} ticket{quantity > 1 ? "s" : ""})</span>
                <span>ETB {totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="ev-payment-actions">
              <button type="button" className="ev-btn-back" onClick={() => { setStep("details"); setPaymentMethod(""); }}>Back</button>
              <button type="button" className="ev-book-btn" onClick={handlePay} disabled={!paymentMethod || !payee}>Pay ETB {totalPrice.toFixed(2)}</button>
            </div>
          </div>
          );
        })()}

        {/* STEP: Processing */}
        {step === "processing" && (
          <div className="ev-booking-section ev-processing">
            <div className="ev-processing-spinner" />
            <h3>Processing Payment</h3>
            <p>Via {PAYMENT_METHODS.find(p => p.id === paymentMethod)?.name}...</p>
            <p className="ev-processing-hint">Please wait, do not close this page</p>
          </div>
        )}

        {/* STEP: Success */}
        {step === "success" && (
          <div className="ev-booking-section ev-success">
            <div className="ev-success-check">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#0be881" strokeWidth="3"/>
                <path d="M14 24L21 31L34 17" stroke="#0be881" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Booking Confirmed!</h3>
            <p>{quantity} {hasTiers ? `${activeTier.name} ` : ""}ticket(s) for {event.title}</p>
            <div className="ev-success-actions">
              <button type="button" className="ev-book-btn" onClick={downloadQR}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 11V13H14V11M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Download QR Code
              </button>
              <button type="button" className="ev-btn-back" onClick={() => navigate("/my-bookings")}>View My Bookings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
