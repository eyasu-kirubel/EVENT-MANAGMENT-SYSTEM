import { useState, useEffect } from "react";
import { api } from "../utils/api";
import EventCard from "../components/EventCard";
import { CATEGORIES } from "../utils/categories";

const MOCK_EVENTS = [
  { id: 1, title: "Coachella Valley Music Festival", category: "Concert", location: "Indio, California", price: 250, startDate: "11-04-2025", endDate: "20-04-2025", photo: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80", description: "The world-famous Coachella Valley Music and Arts Festival returns with an incredible lineup of artists across multiple stages in the desert.", status: "Approved", capacity: 125000, ticketsSold: 98000, organizerName: "Goldenvoice" },
  { id: 2, title: "Tomorrowland Winter", category: "Concert", location: "Alpe d'Huez, France", price: 350, startDate: "15-03-2025", endDate: "22-03-2025", photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80", description: "Experience the magic of Tomorrowland in the French Alps. Three stages, world-class DJs, and breathtaking mountain views.", status: "Approved", capacity: 25000, ticketsSold: 22500, organizerName: "Tomorrowland" },
  { id: 3, title: "Web Summit 2025", category: "Conference", location: "Lisbon, Portugal", price: 850, startDate: "10-11-2025", endDate: "13-11-2025", photo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80", description: "The world's largest technology conference. 70,000+ attendees, 2,600+ startups, and speakers from Google, Meta, and OpenAI.", status: "Approved", capacity: 70000, ticketsSold: 54000, organizerName: "Web Summit Ltd" },
  { id: 4, title: "TED Conference 2025", category: "Seminar", location: "Vancouver, Canada", price: 1200, startDate: "14-04-2025", endDate: "18-04-2025", photo: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80", description: "Ideas worth spreading. Join the world's leading thinkers and doers for five days of talks, workshops, and unforgettable experiences.", status: "Approved", capacity: 1800, ticketsSold: 1750, organizerName: "TED Conferences" },
  { id: 5, title: "UFC 310 Championship", category: "Sports", location: "Las Vegas, Nevada", price: 500, startDate: "20-12-2025", endDate: "20-12-2025", photo: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80", description: "The biggest UFC event of the year. Championship fights, undercard battles, and an electric atmosphere at the T-Mobile Arena.", status: "Approved", capacity: 20000, ticketsSold: 18500, organizerName: "UFC" },
  { id: 6, title: "Art Basel Miami Beach", category: "Exhibition", location: "Miami Beach, Florida", price: 75, startDate: "04-12-2025", endDate: "07-12-2025", photo: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=800&q=80", description: "The premier international art fair for modern and contemporary works. Over 4,000 artists and 270 galleries from around the world.", status: "Approved", capacity: 80000, ticketsSold: 62000, organizerName: "Art Basel" },
  { id: 7, title: "Google I/O Developer Conference", category: "Workshop", location: "Mountain View, California", price: 0, startDate: "20-05-2025", endDate: "21-05-2025", photo: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80", description: "Join Google developers for two days of hands-on workshops, technical talks, and the latest in AI, Android, and cloud technology.", status: "Approved", capacity: 5000, ticketsSold: 4800, organizerName: "Google" },
  { id: 8, title: "Burning Man 2025", category: "General", location: "Black Rock Desert, Nevada", price: 575, startDate: "24-08-2025", endDate: "01-09-2025", photo: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80", description: "A week-long experiment in community and art. Radical self-expression, art installations, and the iconic Man burn in the Nevada desert.", status: "Approved", capacity: 80000, ticketsSold: 72000, organizerName: "Burning Man Project" },
  { id: 9, title: "Cannes Lions Festival", category: "Networking", location: "Cannes, France", price: 650, startDate: "16-06-2025", endDate: "20-06-2025", photo: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80", description: "The global festival of creativity. Celebrating the best in advertising, branding, and creative communications on the French Riviera.", status: "Approved", capacity: 15000, ticketsSold: 13200, organizerName: "Cannes Lions" },
  { id: 10, title: "Glastonbury Festival", category: "Concert", location: "Somerset, England", price: 340, startDate: "25-06-2025", endDate: "29-06-2025", photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80", description: "The largest greenfield music and performing arts festival in the world. Five days of music, theatre, comedy, and circus on Worthy Farm.", status: "Approved", capacity: 210000, ticketsSold: 210000, organizerName: "Glastonbury Festivals" },
  { id: 11, title: "CES 2025", category: "Conference", location: "Las Vegas, Nevada", price: 300, startDate: "07-01-2025", endDate: "10-01-2025", photo: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80", description: "The world's most influential tech event. 4,500+ exhibitors showcasing the latest in AI, robotics, smart homes, and mobility.", status: "Approved", capacity: 130000, ticketsSold: 115000, organizerName: "Consumer Technology Association" },
  { id: 12, title: "Sundance Film Festival", category: "Exhibition", location: "Park City, Utah", price: 40, startDate: "23-01-2025", endDate: "02-02-2025", photo: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80", description: "The ultimate showcase of independent cinema. Premieres, documentaries, shorts, and panels from visionary filmmakers around the globe.", status: "Approved", capacity: 46000, ticketsSold: 38000, organizerName: "Sundance Institute" },
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
      setEvents(data.length ? data : MOCK_EVENTS);
    } catch {
      setEvents(MOCK_EVENTS);
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
    <div className="m2-events-page page-enter">
      {/* Hero */}
      <section className="m2-hero">
        <div className="m2-hero-mesh" />
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
          {CATEGORIES.map((cat) => {
            const active = filter === cat.value;
            return (
              <button
                key={cat.value}
                className={`m2-pill ${active ? "active" : ""}`}
                style={
                  active
                    ? { background: cat.gradient, borderColor: "transparent", boxShadow: `0 4px 16px ${cat.color}40` }
                    : { "--pill-hover-color": cat.color }
                }
                onClick={() => setFilter(filter === cat.value ? "" : cat.value)}
              >
                <span className="m2-pill-icon">{cat.icon}</span> {cat.label}
              </button>
            );
          })}
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
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="m2-empty">
            <div className="m2-empty-icon">
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M18 20C18 20 20 18 24 18C28 18 30 20 30 20" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="18" r="1" fill="#475569" />
                <circle cx="30" cy="18" r="1" fill="#475569" />
                <path d="M18 30C18 30 20 33 24 33C28 33 30 30 30 30" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
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
