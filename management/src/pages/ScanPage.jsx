import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function ScanPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!bookingId) { setStatus("invalid"); return; }
    fetch(`/api/scan/${bookingId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setBooking(data);
        setStatus("found");
      })
      .catch(() => setStatus("invalid"));
  }, [bookingId]);

  const handleCheckIn = async () => {
    setMsg("");
    try {
      const res = await fetch(`/api/scan/${bookingId}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooking({ ...booking, status: "scanned" });
      setMsg("checked_in");
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (status === "loading") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Verifying ticket...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>✕</div>
          <h1 style={styles.errorTitle}>Invalid Ticket</h1>
          <p style={styles.errorText}>This QR code is not recognized or the booking does not exist.</p>
          <div style={styles.invalidId}>#{bookingId}</div>
        </div>
      </div>
    );
  }

  const isScanned = booking.status === "scanned";
  const isCancelled = booking.status === "cancelled";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* HEADER */}
        <div style={{
          ...styles.header,
          background: isScanned
            ? 'linear-gradient(135deg, #059669, #10b981)'
            : isCancelled
            ? 'linear-gradient(135deg, #dc2626, #ef4444)'
            : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        }}>
          <div style={styles.headerIcon}>
            {isScanned ? "✓" : isCancelled ? "✕" : "🎟️"}
          </div>
          <h1 style={styles.headerTitle}>
            {isScanned ? "Already Checked In" : isCancelled ? "Booking Cancelled" : "EventHub Ticket"}
          </h1>
          <p style={styles.headerSub}>Booking #{booking.id}</p>
        </div>

        {/* STATUS BANNER */}
        {isScanned && (
          <div style={styles.successBanner}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <strong>Attendance Confirmed</strong>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>This ticket has been scanned</p>
            </div>
          </div>
        )}
        {isCancelled && (
          <div style={styles.cancelBanner}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>This booking has been cancelled</strong>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>Entry is not permitted</p>
            </div>
          </div>
        )}

        {/* QR DISPLAY */}
        {booking.qrcode && (
          <div style={styles.qrBox}>
            <img src={booking.qrcode} alt="Ticket QR" style={styles.qrImage} />
          </div>
        )}

        {/* EVENT DETAILS */}
        <div style={styles.section}>
          <h2 style={styles.eventTitle}>{booking.eventTitle}</h2>
          <span style={styles.category}>{booking.eventCategory}</span>
        </div>

        <div style={styles.details}>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>📍</span>
            <div>
              <span style={styles.detailLabel}>Location</span>
              <span style={styles.detailValue}>{booking.eventLocation}</span>
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>📅</span>
            <div>
              <span style={styles.detailLabel}>Date</span>
              <span style={styles.detailValue}>{booking.eventDate}{booking.eventDate !== booking.eventEndDate ? ` - ${booking.eventEndDate}` : ""}</span>
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>👤</span>
            <div>
              <span style={styles.detailLabel}>Attendee</span>
              <span style={styles.detailValue}>{booking.userName}</span>
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>📱</span>
            <div>
              <span style={styles.detailLabel}>Phone</span>
              <span style={styles.detailValue}>{booking.userPhone}</span>
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>🎟️</span>
            <div>
              <span style={styles.detailLabel}>Tickets</span>
              <span style={styles.detailValue}>{booking.quantity}</span>
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>💰</span>
            <div>
              <span style={styles.detailLabel}>Price</span>
              <span style={styles.detailValue}>ETB {booking.eventPrice?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CHECK-IN BUTTON */}
        {!isScanned && !isCancelled && (
          <button onClick={handleCheckIn} style={styles.checkInBtn}>
            ✓ Check In Attendee
          </button>
        )}

        {msg === "checked_in" && (
          <div style={styles.successMsg}>
            ✅ Attendance confirmed! Welcome, {booking.userName}!
          </div>
        )}
        {msg && msg !== "checked_in" && (
          <div style={styles.errorMsg}>{msg}</div>
        )}

        {/* FOOTER */}
        <div style={styles.footer}>
          <span>🎪 EventHub — Addis Ababa</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0a1a, #1a1030, #0f0a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: 'rgba(20,15,35,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.5)' },

  spinner: { width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  loadingText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14 },

  errorIcon: { width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fca5a5', margin: '0 auto 16px' },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  errorText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14, padding: '0 24px', lineHeight: 1.5 },
  invalidId: { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },

  header: { padding: '32px 24px', textAlign: 'center' },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', margin: 0 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' },

  successBanner: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 20px', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, color: '#6ee7b7', fontSize: 14 },
  cancelBanner: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 20px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: 14 },

  qrBox: { padding: '20px', textAlign: 'center', margin: '16px 20px', background: 'white', borderRadius: 14 },
  qrImage: { width: 180, height: 180, display: 'block', margin: '0 auto', borderRadius: 8 },

  section: { padding: '0 24px', textAlign: 'center', marginTop: 16 },
  eventTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', margin: '0 0 6px' },
  category: { display: 'inline-block', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 },

  details: { padding: '16px 24px' },
  detailItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  detailIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  detailLabel: { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { display: 'block', fontSize: 14, color: 'white', fontWeight: 500 },

  checkInBtn: { display: 'block', width: 'calc(100% - 48px)', margin: '16px 24px', padding: '14px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' },
  successMsg: { margin: '0 24px 16px', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#6ee7b7', fontSize: 14, textAlign: 'center' },
  errorMsg: { margin: '0 24px 16px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: 14, textAlign: 'center' },

  footer: { textAlign: 'center', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)', fontSize: 12 },
};
