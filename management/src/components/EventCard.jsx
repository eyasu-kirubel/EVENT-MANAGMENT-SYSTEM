import { Link } from "react-router-dom";
import { useState } from "react";

const CATEGORY_ICONS = {
  Concert: "🎵", Seminar: "🎓", Workshop: "🔧", Conference: "🎵",
  Sports: "⚽", Exhibition: "🖼", Networking: "🤝", Art: "🎨",
  "Kids Zone": "🧸", Food: "🍕", Cultural: "🌍", Fashion: "👗",
  Business: "💼", General: "📋",
};

export default function EventCard({ event, index }) {
  const [liked, setLiked] = useState(false);
  const delay = Math.min(index * 0.06, 0.3);

  return (
    <Link to={`/events/${event.id}`} className="g-card" style={{ animationDelay: `${delay}s` }}>
      <div className="g-card-img-wrap">
        {event.photo ? (
          <img src={event.photo} alt={event.title} className="g-card-img" />
        ) : (
          <div className="g-card-placeholder">{CATEGORY_ICONS[event.category] || "✨"}</div>
        )}
        <span className="g-card-badge">{CATEGORY_ICONS[event.category] || "✨"} {event.category}</span>
        <button
          className={`g-card-like ${liked ? "liked" : ""}`}
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={liked ? "#ff4757" : "none"}>
            <path d="M9 15.5C9 15.5 2.5 11.5 2.5 7C2.5 4.5 4.5 3 6.5 3C8 3 9 4 9 4C9 4 10 3 11.5 3C13.5 3 15.5 4.5 15.5 7C15.5 11.5 9 15.5 9 15.5Z" stroke={liked ? "#ff4757" : "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="g-card-body">
        <h3 className="g-card-title">{event.title}</h3>
        <p className="g-card-desc">
          {event.description || `${event.location} · ${event.startDate}`}
        </p>
        <div className="g-card-footer">
          <span className="g-card-price">{event.price === 0 ? "Free" : `ETB ${event.price}`}</span>
          <span className="g-card-date">{event.startDate}</span>
        </div>
      </div>
    </Link>
  );
}
