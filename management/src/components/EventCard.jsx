import { Link } from "react-router-dom";
import { getCategoryMeta } from "../utils/categories";

export default function EventCard({ event, index }) {
  const delay = Math.min(index * 0.08, 0.4);
  const meta = getCategoryMeta(event.category);

  return (
    <Link
      to={`/events/${event.id}`}
      className="gallery-card"
      style={{ animationDelay: `${delay}s`, "--cat-color": meta.color }}
    >
      <img
        src={event.photo || meta.image}
        alt={event.title}
        className="gallery-card-img"
        loading="lazy"
      />

      <div className="gallery-card-gradient" />

      <div className="gallery-card-content">
        <div className="gallery-card-top">
          <span
            className="gallery-card-category"
            style={{ background: `${meta.color}cc`, color: "white" }}
          >
            {meta.icon} {event.category}
          </span>
          <span className="gallery-card-price">
            {event.price === 0 ? "Free" : `ETB ${event.price}`}
          </span>
        </div>

        <div className="gallery-card-bottom">
          <h3 className="gallery-card-title">{event.title}</h3>
          <div className="gallery-card-meta">
            <span className="gallery-card-meta-item">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              {event.location}
            </span>
            <span className="gallery-card-meta-item">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4.5 1V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M9.5 1V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {event.startDate}
            </span>
          </div>
        </div>
      </div>

      <div className="gallery-card-hover">
        <div className="gallery-card-hover-inner">
          {event.description && (
            <p className="gallery-card-desc">
              {event.description.length > 100
                ? event.description.slice(0, 100) + "..."
                : event.description}
            </p>
          )}
          <span className="gallery-card-cta" style={{ background: meta.gradient }}>
            View Event
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
