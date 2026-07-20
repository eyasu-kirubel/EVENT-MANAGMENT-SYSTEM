import { useState, useEffect } from "react";
import { api } from "../utils/api";
import EventCard from "../components/EventCard";

const CATEGORIES = [
  { value: "", label: "All Events" },
  { value: "Concert", label: "Concerts" },
  { value: "Seminar", label: "Seminars" },
  { value: "Workshop", label: "Workshops" },
  { value: "Conference", label: "Conferences" },
  { value: "Sports", label: "Sports" },
  { value: "Exhibition", label: "Exhibitions" },
  { value: "Networking", label: "Networking" },
  { value: "General", label: "General" },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await api.get("/events");
      setEvents(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const filtered = events.filter((e) => {
    const matchCategory = !filter || e.category === filter;
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="m2-events-page">
      {/* Hero */}
      <section className="m2-hero">
        <div className="m2-hero-content">
          <span className="m2-hero-badge">Discover Events</span>
          <h1>
            Find your next
            <span className="m2-hero-accent"> experience</span>
          </h1>
          <p>Explore concerts, workshops, conferences, and more in your area</p>
        </div>
        <div className="m2-hero-decor">
          <div className="m2-hero-circle c1" />
          <div className="m2-hero-circle c2" />
          <div className="m2-hero-circle c3" />
        </div>
      </section>

      {/* Filters */}
      <section className="m2-filters-section">
        <div className="m2-search-box">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="m2-search-clear" onClick={() => setSearch("")}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M3 11L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="m2-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`m2-pill ${filter === cat.value ? "active" : ""}`}
              onClick={() => setFilter(filter === cat.value ? "" : cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="m2-results">
        <div className="m2-results-header">
          <h2>
            {filter || search ? "Filtered Results" : "All Events"}
          </h2>
          <span className="m2-results-count">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="m2-loading-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="m2-skeleton-card">
                <div className="m2-skeleton-img" />
                <div className="m2-skeleton-body">
                  <div className="m2-skeleton-line w60" />
                  <div className="m2-skeleton-line w40" />
                  <div className="m2-skeleton-line w80" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="m2-empty">
            <div className="m2-empty-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#ddd" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M18 20C18 20 20 18 24 18C28 18 30 20 30 20" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="18" r="1" fill="#ccc" />
                <circle cx="30" cy="18" r="1" fill="#ccc" />
                <path d="M18 30C18 30 20 33 24 33C28 33 30 30 30 30" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>No events found</h3>
            <p>Try adjusting your search or filter to find what you're looking for</p>
            {(search || filter) && (
              <button className="m2-btn-reset" onClick={() => { setSearch(""); setFilter(""); }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="m2-events-grid">
            {filtered.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
