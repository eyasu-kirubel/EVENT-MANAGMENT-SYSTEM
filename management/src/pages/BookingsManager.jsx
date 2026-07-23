import { useState, useEffect } from "react";

export default function BookingsManager() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => setBookings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await fetch(`/api/bookings/${id}/cancel`, { method: "PUT" });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch {}
  };

  const handlePrint = (b) => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Booking #${b.id}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 40px; background: #f8f9fa; }
        .ticket { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; padding: 24px; }
        .header h1 { font-size: 20px; margin: 0 0 4px; }
        .header p { opacity: 0.8; margin: 0; font-size: 13px; }
        .body { padding: 24px; }
        .info { text-align: left; margin: 12px 0; }
        .info label { font-size: 11px; color: #999; text-transform: uppercase; display: block; margin-bottom: 2px; }
        .info span { font-size: 14px; color: #333; font-weight: 500; }
        img { width: 180px; height: 180px; margin: 16px auto; display: block; }
        .footer { padding: 16px; background: #f0f0f0; font-size: 12px; color: #999; }
      </style></head><body>
      <div class="ticket">
        <div class="header"><h1>🎪 EventHub Ticket</h1><p>Booking #${b.id}</p></div>
        <div class="body">
          <img src="${b.qrcode}" />
          <div class="info"><label>Event</label><span>${b.eventTitle}</span></div>
          <div class="info"><label>Attendee</label><span>${b.userName}</span></div>
          <div class="info"><label>Location</label><span>${b.eventLocation}</span></div>
          <div class="info"><label>Date</label><span>${b.eventDate}</span></div>
          <div class="info"><label>Quantity</label><span>${b.quantity} ticket(s)</span></div>
        </div>
        <div class="footer">Show this QR code at the entrance</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const confirmed = bookings.filter(b => b.status === "confirmed");

  return (
    <div>
      {/* STATS */}
      <div style={styles.stats}>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{bookings.length}</span>
          <span style={styles.statLabel}>Total Bookings</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{confirmed.length}</span>
          <span style={styles.statLabel}>Confirmed</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{bookings.length - confirmed.length}</span>
          <span style={styles.statLabel}>Cancelled</span>
        </div>
      </div>

      {/* VIEW TOGGLE */}
      <div style={styles.toolbar}>
        <div style={styles.viewToggle}>
          <button onClick={() => setView("cards")} style={{ ...styles.viewBtn, background: view === "cards" ? "var(--primary)" : "rgba(255,255,255,0.05)" }}>
            🎟️ Cards
          </button>
          <button onClick={() => setView("table")} style={{ ...styles.viewBtn, background: view === "table" ? "var(--primary)" : "rgba(255,255,255,0.05)" }}>
            📋 Table
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.4)' }}>No bookings yet.</div>
      ) : view === "cards" ? (
        /* QR CARD VIEW — QR codes displayed directly */
        <div style={styles.cardGrid}>
          {bookings.map((b) => (
            <div key={b.id} style={{
              ...styles.ticketCard,
              opacity: b.status === "cancelled" ? 0.5 : 1,
            }}>
              {/* Ticket Header */}
              <div style={styles.ticketHeader}>
                <h3 style={styles.ticketTitle}>{b.eventTitle}</h3>
                <span style={{
                  ...styles.statusBadge,
                  background: b.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: b.status === 'confirmed' ? '#6ee7b7' : '#fca5a5',
                }}>{b.status}</span>
              </div>

              {/* QR CODE — Displayed directly */}
              {b.qrcode && b.status === "confirmed" && (
                <div style={styles.qrSection}>
                  <img src={b.qrcode} alt="Ticket QR Code" style={styles.qrImage} />
                  <span style={styles.qrLabel}>Scan at entrance</span>
                </div>
              )}

              {/* Ticket Details */}
              <div style={styles.ticketBody}>
                <div style={styles.detailRow}>
                  <span style={styles.detailIcon}>👤</span>
                  <span style={styles.detailLabel}>Attendee</span>
                  <span style={styles.detailValue}>{b.userName}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailIcon}>📍</span>
                  <span style={styles.detailLabel}>Location</span>
                  <span style={styles.detailValue}>{b.eventLocation}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailIcon}>📅</span>
                  <span style={styles.detailLabel}>Date</span>
                  <span style={styles.detailValue}>{b.eventDate}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailIcon}>🎟️</span>
                  <span style={styles.detailLabel}>Tickets</span>
                  <span style={styles.detailValue}>{b.quantity}</span>
                </div>
              </div>

              {/* Ticket Footer */}
              <div style={styles.ticketFooter}>
                <span style={styles.bookingId}>#{b.id}</span>
                <div style={styles.ticketActions}>
                  {b.status === "confirmed" && (
                    <button onClick={() => handlePrint(b)} style={styles.printBtn}>🖨 Print</button>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => handleCancel(b.id)} style={styles.cancelBtn}>Cancel</button>
                  )}
                </div>
              </div>

              {/* Decorative perforation */}
              <div style={styles.perforation} />
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>QR Code</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={styles.tr}>
                  <td style={styles.td}>{b.userName}</td>
                  <td style={styles.td}>
                    <div style={styles.eventCell}>
                      <img src={b.eventImage} alt="" style={styles.thumb} />
                      <span>{b.eventTitle}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{b.eventLocation}</td>
                  <td style={styles.td}>{b.quantity}</td>
                  <td style={styles.td}>{b.eventDate}</td>
                  <td style={styles.td}>
                    {b.qrcode && b.status === "confirmed" ? (
                      <img src={b.qrcode} alt="QR" style={styles.tableQr} />
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: b.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: b.status === 'confirmed' ? '#6ee7b7' : '#fca5a5',
                    }}>{b.status}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {b.status === "confirmed" && (
                        <button onClick={() => handlePrint(b)} style={styles.printBtn}>🖨</button>
                      )}
                      {b.status === "confirmed" && (
                        <button onClick={() => handleCancel(b.id)} style={styles.cancelBtn}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' },
  statNum: { fontSize: '24px', fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  viewToggle: { display: 'flex', gap: 6 },
  viewBtn: { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: 8, fontSize: '13px', cursor: 'pointer' },

  /* CARD VIEW */
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  ticketCard: { background: 'rgba(20, 15, 35, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', position: 'relative' },
  ticketHeader: { padding: '16px 20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(91,33,182,0.1))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.08)' },
  ticketTitle: { fontSize: '15px', fontWeight: 'bold', color: 'white', margin: 0 },

  qrSection: { padding: '20px', textAlign: 'center', background: 'white', margin: '16px 20px', borderRadius: 12 },
  qrImage: { width: 160, height: 160, display: 'block', margin: '0 auto 8px', borderRadius: 8 },
  qrLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' },

  ticketBody: { padding: '16px 20px' },
  detailRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  detailIcon: { fontSize: '14px', width: 24 },
  detailLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', width: 70 },
  detailValue: { fontSize: '13px', color: 'white', fontWeight: 500, flex: 1 },

  ticketFooter: { padding: '12px 20px', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bookingId: { fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' },
  ticketActions: { display: 'flex', gap: 6 },

  perforation: { position: 'absolute', bottom: 50, left: 0, right: 0, borderTop: '2px dashed rgba(255,255,255,0.05)' },

  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' },
  printBtn: { background: 'rgba(59,130,246,0.15)', border: 'none', color: '#93c5fd', padding: '5px 12px', borderRadius: 6, fontSize: '12px', cursor: 'pointer' },
  cancelBtn: { background: 'rgba(239,68,68,0.15)', border: 'none', color: '#fca5a5', padding: '5px 12px', borderRadius: 6, fontSize: '12px', cursor: 'pointer' },

  /* TABLE VIEW */
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '10px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', verticalAlign: 'middle' },
  eventCell: { display: 'flex', alignItems: 'center', gap: 10 },
  thumb: { width: 36, height: 36, borderRadius: 6, objectFit: 'cover' },
  tableQr: { width: 48, height: 48, borderRadius: 6, background: 'white', padding: 2 },
  actions: { display: 'flex', gap: 6 },
};
