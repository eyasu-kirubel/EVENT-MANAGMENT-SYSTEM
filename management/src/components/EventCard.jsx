import { Link } from "react-router-dom";
import { BsCalendar3, BsHeart, BsHeartFill, BsGeoAlt, BsGlobe2, BsLock } from "react-icons/bs";
import { useMemo } from "react";

const CATEGORY_ICONS = {
  Concert: "", Seminar: "", Workshop: "", Conference: "", Sports: "",
  Exhibition: "", Networking: "", Art: "", "Kids Zone": "", Food: "",
  Cultural: "", Fashion: "", Business: "", General: "",
};

export default function EventCard({ event, index = 0, liked = false, onFavorite }) {
  const delay = Math.min(index * 0.04, 0.25);
  const image = useMemo(() => event.photo || null, [event.photo]);
  const price = Number(event.price) || 0;
  let meta = {};
  try { meta = JSON.parse(localStorage.getItem("eventFrontendMeta") || "{}")[String(event.id)] || {}; } catch {}

  return (
    <article className="event-card" style={{ animationDelay: `${delay}s` }}>
      <Link to={`/events/${event.id}`} className="event-card-link">
        <div className="event-card-media">
          {image ? <img src={image} alt={event.title} /> : <div className="event-card-placeholder">{CATEGORY_ICONS[event.category] || "E"}</div>}
          <span className="event-card-category">{event.category || "General"}</span>
          {meta.eventType === "online" && <span className="event-card-type"><BsGlobe2 /> Online</span>}
          {meta.visibility === "private" && <span className="event-card-type private"><BsLock /> Private</span>}
        </div>
        <div className="event-card-body">
          <h3>{event.title}</h3>
          <p className="event-card-description">{event.description || "Discover this event and reserve your ticket."}</p>
          <div className="event-card-meta"><span><BsCalendar3 /> {event.startDate}</span><span><BsGeoAlt /> {event.location}</span></div>
          <div className="event-card-footer"><strong>{price === 0 ? "Free" : `ETB ${price}`}</strong><span>View details</span></div>
        </div>
      </Link>
      <button className={`event-card-favorite ${liked ? "liked" : ""}`} onClick={() => onFavorite?.(event.id)} aria-label={liked ? "Remove favorite" : "Add favorite"}>
        {liked ? <BsHeartFill /> : <BsHeart />}
      </button>
    </article>
  );
}
