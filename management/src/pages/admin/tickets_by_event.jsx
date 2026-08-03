import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

import bg1 from "../../assets/images/bg1.jpg";

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

  if (loading) return <div className="loading">Loading ticket data...</div>;

  const totalTickets = rows.reduce((sum, r) => sum + (r.ticketsSold ?? 0), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + (r.revenue ?? 0), 0);

  return (
    <div className="admin-wrap">
      <div className="admin-bg" style={{ backgroundImage: `url(${bg1})` }} />
      <div className="admin-bg-overlay" />

      <div className="admin-sub">
        <Link to="/admin" className="admin-back">← Back to Dashboard</Link>
        <h1>Tickets by Event</h1>
        <p className="admin-sub-hint">How many tickets each event has sold, and the revenue it generated.</p>

        <div className="admin-sub-stats">
          <div className="admin-sub-stat">
            <h3>{totalTickets}</h3>
            <p>Total tickets sold</p>
          </div>
          <div className="admin-sub-stat">
            <h3>${Number(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p>Total revenue</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="empty">No events found.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Organizer</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Capacity</th>
                  <th>Tickets Sold</th>
                  <th>Sections</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="admin-event-title">{r.title}</td>
                    <td>{r.organizerName}</td>
                    <td>{r.category}</td>
                    <td>{r.startDate}</td>
                    <td>{r.capacity}</td>
                    <td className="admin-sold-cell">{r.ticketsSold}</td>
                    <td>
                      {r.tiers && r.tiers.length > 0 ? (
                        <div className="admin-tier-chips">
                          {r.tiers.map((t) => (
                            <span key={t.name} className="admin-tier-chip">{t.name}: {t.sold}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="admin-revenue-cell">—</span>
                      )}
                    </td>
                    <td className="admin-revenue-cell">${Number(r.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
