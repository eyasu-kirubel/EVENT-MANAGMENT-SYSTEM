import { Link } from "react-router-dom";

const CATEGORY_ICONS = {
  Concert: "\u266B",
  Seminar: "\uD83D\uDCDD",
  Workshop: "\uD83D\uDD27",
  Conference: "\uD83D\uDCBB",
  Sports: "\u26BD",
  Exhibition: "\uD83C\uDFA8",
  Networking: "\uD83E\uDD1D",
  General: "\u2B50",
};

export default function EventCard({ event, index }) {
  const delay = Math.min(index * 0.06, 0.3);

  return (
    <Link
      to={`/events/${event.id}`}
      className="m2-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="m2-card-img-wrap">
        {event.photo ? (
          <img src={event.photo} alt={event.title} className="m2-card-img" />
        ) : (
          <div className="m2-card-img-placeholder">
            <span>{CATEGORY_ICONS[event.category] || "\u2728"}</span>
          </div>
        )}
        <div className="m2-card-price">
          {event.price === 0 ? "Free" : `ETB ${event.price}`}
        </div>
      </div>

      <div className="m2-card-body">
        <div className="m2-card-top">
          <span className="m2-card-category">
            {CATEGORY_ICONS[event.category] || "\u2728"} {event.category}
          </span>
        </div>

        <h3 className="m2-card-title">{event.title}</h3>

        <div className="m2-card-meta">
          <div className="m2-card-meta-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span>{event.location}</span>
          </div>
          <div className="m2-card-meta-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>{event.startDate}</span>
          </div>
        </div>

        <div className="m2-card-footer">
          <span className="m2-card-date-range">
            {event.startDate} — {event.endDate}
          </span>
          <span className="m2-card-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
