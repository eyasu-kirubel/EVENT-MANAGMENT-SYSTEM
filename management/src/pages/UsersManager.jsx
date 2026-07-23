import { useState, useEffect } from "react";

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roleColors = {
    admin: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
    organizer: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
    customer: { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
  };

  return (
    <div>
      <div style={styles.stats}>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{users.length}</span>
          <span style={styles.statLabel}>Total Users</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{users.filter(u => u.role === 'customer').length}</span>
          <span style={styles.statLabel}>Customers</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{users.filter(u => u.role === 'organizer').length}</span>
          <span style={styles.statLabel}>Organizers</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{users.filter(u => u.role === 'admin').length}</span>
          <span style={styles.statLabel}>Admins</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>{u.fullname.charAt(0)}</div>
                      <span style={styles.userName}>{u.fullname}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{u.phonenumber}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(roleColors[u.role] || roleColors.customer) }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={styles.td}>{u.createdAt || "—"}</td>
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
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' },
  statNum: { fontSize: '24px', fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '10px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' },
  userName: { fontWeight: 500, color: 'white' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' },
};
