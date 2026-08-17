// src/pages/organizer/event_detail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../utils/api";
import { CATEGORY_ICONS } from "../../constants/categories";
import { BsCalendar3, BsGeoAlt, BsPerson } from "react-icons/bs";

function formatDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function OrganizerEventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvent = useCallback(async () => {
    try {
      const data = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      setError(err.message || "Event not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  if (loading) return <div className="loading">Loading event...</div>;
  if (error) return (
    <div className="page">
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>
      <div className="error">{error}</div>
    </div>
  );
  if (!event) return (
    <div className="page">
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>
      <div className="error">Event not found</div>
    </div>
  );

  const tiers = Array.isArray(event.ticketTiers) ? event.ticketTiers : [];
  const hasTiers = tiers.length > 0;
  const minTierPrice = hasTiers ? Math.min(...tiers.map((t) => Number(t.price) || 0)) : event.price;
  const remaining = event.capacity - (event.ticketsSold || 0);
  const soldPercent = event.capacity > 0 ? ((event.ticketsSold || 0) / event.capacity) * 100 : 0;

  return (
    <div className="ev-detail">
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>

      {/* Hero */}
      <div className="ev-hero">
        {event.photo ? (
          <img src={event.photo} alt={event.title} className="ev-hero-img" />
        ) : (
          <div className="ev-hero-placeholder">
            <span>{event.category || "General"}</span>
          </div>
        )}
        <div className="ev-hero-overlay" />
        <div className="ev-hero-content">
          <span className="ev-hero-category">{event.category || "General"} {event.category}</span>
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
            <div className="ev-info-icon"><BsGeoAlt /></div>
            <div><span className="ev-info-label">Location</span><span className="ev-info-value">{event.location}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon"><BsCalendar3 /></div>
            <div><span className="ev-info-label">Start Date</span><span className="ev-info-value">{formatDateStr(event.startDate)}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon"><BsCalendar3 /></div>
            <div><span className="ev-info-label">End Date</span><span className="ev-info-value">{formatDateStr(event.endDate)}</span></div>
          </div>
          <div className="ev-info-card">
            <div className="ev-info-icon"><BsPerson /></div>
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

        {/* Ticket Tiers */}
        {hasTiers && (
          <div className="ev-tier-panel">
            <h3>Ticket Sections</h3>
            <div className="ev-tier-options">
              {tiers.map((t) => {
                const sold = (event.tierSales && event.tierSales[t.name]) || 0;
                const tRem = Math.max(0, Number(t.capacity) - sold);
                return (
                  <div key={t.name} className={`ev-tier-card ${tRem <= 0 ? "sold-out" : ""}`}>
                    <span className="ev-tier-name">{t.name}</span>
                    <span className="ev-tier-price">{Number(t.price) === 0 ? "Free" : `ETB ${Number(t.price)}`}</span>
                    <span className="ev-tier-left">{tRem <= 0 ? "Sold out" : `${tRem} of ${t.capacity} left`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="ev-description">
            <h3>About this event</h3>
            <p>{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
