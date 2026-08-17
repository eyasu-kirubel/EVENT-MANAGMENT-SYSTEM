import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { EVENT_CATEGORIES as staticCategories } from "../constants/categories";
import EventCard from "../components/EventCard";
import {
  BsCalendar3,
  BsCheckCircle,
  BsClock,
  BsGeoAlt,
  BsGear,
  BsHeart,
  BsSearch,
  BsTicketPerforated,
  BsXCircle,
  BsMusicNoteBeamed,
  BsPalette,
  BsTrophy,
  BsBook,
  BsBriefcase,
  BsCupHot,
  BsStars,
  BsPerson,
  BsGlobe,
  BsTools,
} from "react-icons/bs";

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}


export default function EventsPage({ showBack = false }) {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "events";

  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [settings, setSettings] = useState({
    fullname: "",
    phonenumber: "",
    email: "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/events").catch(() => []),
      api.get("/tickets/my").catch(() => []),
    ]).then(([eventData, ticketData]) => {
      if (!cancelled) {
        setEvents(Array.isArray(eventData) ? eventData : []);
        setTickets(Array.isArray(ticketData) ? ticketData : []);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
      setFavorites(Array.isArray(saved) ? saved : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    setSettings({
      fullname: user?.fullname || "",
      phonenumber: user?.phonenumber || "",
      email: user?.email || "",
    });
  }, [user]);

  const categories = useMemo(
    () => [
      "All",
      ...new Set([
        ...staticCategories,
        ...events.map((event) => event.category).filter(Boolean),
      ]),
    ],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const text = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        category === "All" || event.category === category;

      const haystack =
        `${event.title || ""} ${event.location || ""} ${
          event.category || ""
        }`.toLowerCase();

      const matchesText = !text || haystack.includes(text);
      const start = dateOnly(event.startDate);
      const matchesFrom = !dateFrom || start >= dateFrom;
      const matchesTo = !dateTo || start <= dateTo;
      const matchesFavorite =
        activeTab !== "favorites" || favorites.includes(event.id);

      return (
        matchesCategory &&
        matchesText &&
        matchesFrom &&
        matchesTo &&
        matchesFavorite
      );
    });
  }, [events, category, query, dateFrom, dateTo, activeTab, favorites]);

  const today = new Date().toISOString().slice(0, 10);

  const myEventGroups = useMemo(
    () => ({
      upcoming: tickets.filter(
        (ticket) =>
          !ticket.scanned && dateOnly(ticket.eventStartDate) >= today
      ),
      attended: tickets.filter((ticket) => !!ticket.scanned),
      past: tickets.filter(
        (ticket) =>
          !ticket.scanned && dateOnly(ticket.eventStartDate) < today
      ),
    }),
    [tickets, today]
  );

  function toggleFavorite(id) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];

    setFavorites(next);
    localStorage.setItem("favorites", JSON.stringify(next));
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSettingsMessage("");
    setSettingsError("");

    try {
      const res = await api.put("/user/profile", settings);
      updateUser(settings);
      setSettingsMessage(res.message || "Profile updated successfully.");
    } catch (err) {
      setSettingsError(err.message || "Could not update your profile.");
    }
  }

  async function downloadQR(ticketId) {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/tickets/${ticketId}/qr`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const svg = await response.text();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ticket-${ticketId}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function cancelTicket(ticket) {
    if (
      !window.confirm(
        `Cancel booking for "${ticket.eventTitle}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/tickets/${ticket.id}`);
      setTickets((prev) => prev.filter((item) => item.id !== ticket.id));
    } catch (err) {
      alert(err.message || "Could not cancel the booking.");
    }
  }

  function renderMyEvent(ticket) {
    return (
      <article className="my-event-card" key={ticket.id}>
        <div className="my-event-icon">
          <BsTicketPerforated />
        </div>

        <div className="my-event-content">
          <div className="my-event-title-row">
            <h3>{ticket.eventTitle}</h3>

            <span
              className={`status-badge ${
                ticket.scanned ? "status-approved" : "status-pending"
              }`}
            >
              {ticket.scanned
                ? "Attended"
                : dateOnly(ticket.eventStartDate) >= today
                ? "Upcoming"
                : "Past"}
            </span>
          </div>

          <p>
            <BsCalendar3 /> {formatDate(ticket.eventStartDate)} –{" "}
            {formatDate(ticket.eventEndDate)}
          </p>

          <p>
            <BsGeoAlt /> {ticket.eventLocation || "Location not set"}
          </p>

          <p>
            {ticket.quantity} ticket
            {Number(ticket.quantity) === 1 ? "" : "s"} ·{" "}
            {ticket.tier || "General"} · ETB{" "}
            {((ticket.unitPrice || 0) * (ticket.quantity || 0)).toFixed(2)}
          </p>
        </div>

        <div className="my-event-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => downloadQR(ticket.id)}
          >
            Download QR
          </button>

          {!ticket.scanned && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => cancelTicket(ticket)}
            >
              Cancel
            </button>
          )}
        </div>
      </article>
    );
  }

  if (loading) {
    return <div className="loading">Loading your workspace...</div>;
  }

  return (
    <div className="customer-content customer-events-page page">
      {showBack && (
        <Link to="/organizer" className="back-link">
          <BsCalendar3 /> Back to dashboard
        </Link>
      )}

      {activeTab === "events" && (
        <>
          <section className="customer-hero">
            <div>
              <span className="section-kicker">DISCOVER</span>
              <h2>Find an event worth attending.</h2>
              <p>
                Browse approved events, compare categories, and book your
                ticket.
              </p>
            </div>

            <div className="customer-hero-icon">
              <BsCalendar3 />
            </div>
          </section>

          <EventFilters
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            categories={categories}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
          />

          <EventGrid
            events={filteredEvents}
            favorites={favorites}
            onFavorite={toggleFavorite}
          />
        </>
      )}

      {activeTab === "favorites" && (
        <>
          <PageTitle
            icon={<BsHeart />}
            title="Favorites"
            text="Keep the events you do not want to miss."
          />

          <EventFilters
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            categories={categories}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
          />

          <EventGrid
            events={filteredEvents}
            favorites={favorites}
            onFavorite={toggleFavorite}
          />
        </>
      )}

      {activeTab === "my-events" && (
        <>
          <PageTitle
            icon={<BsTicketPerforated />}
            title="My Events"
            text="Your tickets organized by their current status."
          />

          <div className="my-event-groups">
            <EventStatusGroup
              title="Upcoming"
              icon={<BsClock />}
              items={myEventGroups.upcoming}
              empty="No upcoming events."
              render={renderMyEvent}
            />

            <EventStatusGroup
              title="Attended"
              icon={<BsCheckCircle />}
              items={myEventGroups.attended}
              empty="No attended events yet."
              render={renderMyEvent}
            />

            <EventStatusGroup
              title="Past"
              icon={<BsXCircle />}
              items={myEventGroups.past}
              empty="No past events."
              render={renderMyEvent}
            />
          </div>
        </>
      )}

      {activeTab === "settings" && (
        <>
          <PageTitle
            icon={<BsGear />}
            title="Settings"
            text="Update your customer profile."
          />

          <form
            className="surface-card customer-settings-form"
            onSubmit={saveSettings}
          >
            {settingsMessage && (
              <div className="notice success">{settingsMessage}</div>
            )}

            {settingsError && (
              <div className="notice error">{settingsError}</div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  value={settings.fullname}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fullname: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={settings.phonenumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      phonenumber: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <button className="btn btn-primary" type="submit">
              Save changes
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function PageTitle({ icon, title, text }) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-kicker">Customer area</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <div className="section-icon">{icon}</div>
    </div>
  );
}

function EventStatusGroup({ title, icon, items, empty, render }) {
  return (
    <section className="status-group">
      <div className="status-group-head">
        <h3>
          {icon}
          {title}
        </h3>
        <span>{items.length}</span>
      </div>

      {items.length ? (
        <div className="my-events-list">{items.map(render)}</div>
      ) : (
        <div className="empty-state">{empty}</div>
      )}
    </section>
  );
}

function EventFilters({
  query,
  setQuery,
  category,
  setCategory,
  categories,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}) {
  const categoryIcons = {
    All: <BsStars />,
    Music: <BsMusicNoteBeamed />,
    Art: <BsPalette />,
    Sports: <BsTrophy />,
    Book: <BsBook />,
    Business: <BsBriefcase />,
    Food: <BsCupHot />,
    Festival: <BsStars />,
    Fashion: <BsPerson />,
    workshop: <BsTools />,
    kids: <BsPerson />,
    cultural: <BsGlobe />,
  };

  return (
    <section className="surface-card event-filters">
      <div className="event-search">
        <BsSearch />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by event, location, or category"
        />
      </div>

      <div className="event-date-range">
        <span className="event-date-label">From</span>

        <div className="event-date-input">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <BsCalendar3 />
        </div>

        <span className="event-date-to">To</span>

        <div className="event-date-input">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
          <BsCalendar3 />
        </div>
      </div>

      <div className="event-category-pills">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={`event-category-pill ${
              category === item ? "active" : ""
            }`}
            onClick={() => setCategory(item)}
          >
            {categoryIcons[item] || <BsStars />}
            <span>{item.charAt(0).toUpperCase() + item.slice(1)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EventGrid({ events, favorites, onFavorite }) {
  if (!events.length) {
    return (
      <div className="empty-state large">
        <BsCalendar3 />
        <h3>No matching events</h3>
        <p>Try another search or category.</p>
      </div>
    );
  }

  return (
    <div className="events-grid">
      {events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          index={index}
          liked={favorites.includes(event.id)}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}
