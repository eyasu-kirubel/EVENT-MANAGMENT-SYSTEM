import { useState, useEffect } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => setRecentBookings(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  if (!stats) return <div style={styles.loading}>Loading dashboard...</div>;

  const statCards = [
    { label: "Total Events", value: stats.totalEvents, icon: "📅", color: "#7c3aed" },
    { label: "Approved", value: stats.approvedEvents, icon: "✅", color: "#10b981" },
    { label: "Pending Approval", value: stats.pendingEvents, icon: "⏳", color: "#f59e0b" },
    { label: "Total Users", value: stats.totalUsers, icon: "👥", color: "#3b82f6" },
    { label: "Total Bookings", value: stats.totalBookings, icon: "🎟️", color: "#8b5cf6" },
    { label: "Revenue (ETB)", value: stats.totalRevenue.toLocaleString(), icon: "💰", color: "#ec4899" },
  ];

  return (
    <div>
      <div style={styles.grid}>
        {statCards.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${s.color}20` }}>
              <span>{s.icon}</span>
            </div>
            <div>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p style={styles.empty}>No bookings yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} style={styles.tr}>
                  <td style={styles.td}>{b.userName}</td>
                  <td style={styles.td}>{b.eventTitle}</td>
                  <td style={styles.td}>{b.quantity}</td>
                  <td style={styles.td}>{b.eventDate}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: b.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: b.status === 'confirmed' ? '#6ee7b7' : '#fca5a5',
                    }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' },
  statIcon: { width: 44, height: 44, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  statValue: { fontSize: '22px', fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 16 },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '10px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
  statusBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 },
};
