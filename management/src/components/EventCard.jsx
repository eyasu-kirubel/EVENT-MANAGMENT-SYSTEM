import { Link } from "react-router-dom";

export default function EventCard({ event, actions }) {
  return (
    <div className="event-card">
      {event.photo ? (
        <img src={event.photo} alt={event.title} className="event-card-img" />
      ) : (
        <div className="event-card-img placeholder">No Image</div>
      )}
      <div className="event-card-body">
        <h3>{event.title}</h3>
        <p className="event-category">{event.category}</p>
        <p>{event.location}</p>
        <p className="event-date">{event.startDate} - {event.endDate}</p>
        <p className="event-price">{event.price === 0 ? "Free" : `ETB ${event.price}`}</p>
        <div className="event-card-footer">
          <Link to={`/events/${event.id}`} className="btn btn-primary">View Details</Link>
          {actions}
        </div>
      </div>
    </div>
  );
}
