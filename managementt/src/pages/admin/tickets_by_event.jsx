import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

const TEXT = "#24164f";
const MUTED = "#4b5563";
const HEADING = "#1f1147";

export default function TicketsByEventPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await api.get("/admin/tickets-per-event");
      setRows(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="loading" style={{ color: TEXT, fontWeight: 600 }}>
      Loading ticket data...
    </div>
  );

  const totalTickets = rows.reduce((sum, r) => sum + (r.ticketsSold ?? 0), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + (r.revenue ?? 0), 0);

  return (
    <div className="admin-wrap" style={{ color: TEXT }}>
      <div className="admin-sub">
        <Link to="/admin" className="admin-back" style={{ color: TEXT, fontWeight: 700 }}>← Back to Dashboard</Link>
        <h1 style={{ color: HEADING }}>Tickets by Event</h1>
        <p className="admin-sub-hint" style={{ color: MUTED }}>How many tickets each event has sold, and the revenue it generated.</p>

        <div className="admin-sub-stats">
          <div className="admin-sub-stat">
            <h3 style={{ color: HEADING }}>{totalTickets}</h3>
            <p style={{ color: MUTED }}>Total tickets sold</p>
          </div>
          <div className="admin-sub-stat">
            <h3 style={{ color: HEADING }}>${Number(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p style={{ color: MUTED }}>Total revenue</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="empty" style={{ color: MUTED }}>No events found.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ color: HEADING }}>Event</th>
                  <th style={{ color: HEADING }}>Organizer</th>
                  <th style={{ color: HEADING }}>Category</th>
                  <th style={{ color: HEADING }}>Date</th>
                  <th style={{ color: HEADING }}>Capacity</th>
                  <th style={{ color: HEADING }}>Tickets Sold</th>
                  <th style={{ color: HEADING }}>Sections</th>
                  <th style={{ color: HEADING }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="admin-event-title" style={{ color: TEXT, fontWeight: 700 }}>{r.title}</td>
                    <td style={{ color: TEXT }}>{r.organizerName}</td>
                    <td style={{ color: TEXT }}>{r.category}</td>
                    <td style={{ color: TEXT }}>{r.startDate}</td>
                    <td style={{ color: TEXT }}>{r.capacity}</td>
                    <td className="admin-sold-cell" style={{ color: TEXT, fontWeight: 700 }}>{r.ticketsSold}</td>
                    <td>
                      {r.tiers && r.tiers.length > 0 ? (
                        <div className="admin-tier-chips">
                          {r.tiers.map((t) => (
                            <span key={t.name} className="admin-tier-chip" style={{ color: TEXT }}>{t.name}: {t.sold}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="admin-revenue-cell" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="admin-revenue-cell" style={{ color: TEXT, fontWeight: 700 }}>${Number(r.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
