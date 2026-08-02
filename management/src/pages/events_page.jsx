// src/pages/UserDashboard.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { EVENT_CATEGORIES as staticCategories, CATEGORY_ICONS } from "../constants/categories";

// Import local images
import bg1 from "../assets/images/bg1.jpg";
import bg2 from "../assets/images/bg2.jpg";
import bg3 from "../assets/images/bg3.jpg";
import bg4 from "../assets/images/bg4.jpg";
import bg5 from "../assets/images/bg5.jpg";
import bg6 from "../assets/images/bg6.jpg";
import bg7 from "../assets/images/bg7.jpg";
import bg8 from "../assets/images/bg8.jpg";
import bg9 from "../assets/images/bg9.jpg";

const BACKGROUND_IMAGES = [
  bg1,
  bg2,
  bg3,
  bg4,
  bg5,
  bg6,
  bg7,
  bg8,
  bg9
];

// Formatters and helpers for API events (date formatting, image fallback,
// tier-aware price, remaining seats).
function formatDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getEventImage(event, index) {
  if (event && event.photo) return event.photo;
  return BACKGROUND_IMAGES[(event && event.id ? event.id : index) % BACKGROUND_IMAGES.length];
}

function getMinTierPrice(event) {
  const tiers = event && Array.isArray(event.ticketTiers) ? event.ticketTiers : [];
  if (tiers.length === 0) return null;
  return Math.min(...tiers.map((t) => Number(t.price) || 0));
}

function getAvailable(event) {
  return Math.max(0, (Number(event.capacity) || 0) - (Number(event.ticketsSold) || 0));
}

export default function UserDashboard({ showBack }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsFullname, setSettingsFullname] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const navTab = searchParams.get("tab");
  const activeTab = ["bookings", "favorites", "settings", "history"].includes(navTab) ? navTab : "events";

  const categories = ["All", ...new Set([...staticCategories, ...events.map((e) => e.category).filter(Boolean)])];

  // Load approved events from the API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/events");
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rotate background images
  useEffect(() => {
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, []);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load real bookings from the API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/tickets/my");
        if (!cancelled) setMyBookings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMyBookings([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Favorites stay in localStorage
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    setFavorites(savedFavorites);
  }, []);

  // Prefill settings from the logged-in user
  useEffect(() => {
    if (user) {
      setSettingsFullname(user.fullname || "");
      setSettingsPhone(user.phonenumber || "");
      setSettingsEmail(user.email || "");
    }
  }, [user]);

  // Favorites filter follows the active tab (navbar tabs drive it via URL)
  useEffect(() => {
    setShowFavoriteOnly(activeTab === "favorites");
  }, [activeTab]);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    const options = { month: 'numeric', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getFilteredEvents = () => {
    let filtered = events;
    if (selectedCategory !== "All") {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        (e.title || "").toLowerCase().includes(query) ||
        (e.location || "").toLowerCase().includes(query) ||
        (e.category || "").toLowerCase().includes(query)
      );
    }
    if (dateFrom) {
      filtered = filtered.filter(e => String(e.startDate || "").slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(e => String(e.startDate || "").slice(0, 10) <= dateTo);
    }
    if (showFavoriteOnly) {
      filtered = filtered.filter(e => favorites.includes(e.id));
    }
    return filtered;
  };

  const handleBookTicket = (event) => {
    navigate(`/events/${event.id}`);
  };

  const toggleFavorite = (eventId) => {
    let updatedFavorites;
    if (favorites.includes(eventId)) {
      updatedFavorites = favorites.filter(id => id !== eventId);
    } else {
      updatedFavorites = [...favorites, eventId];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsMessage("");
    setSettingsError("");
    try {
      const res = await api.put("/user/profile", {
        fullname: settingsFullname,
        phonenumber: settingsPhone,
        email: settingsEmail,
      });
      setSettingsMessage(res.message || "Profile updated.");
      updateUser({ fullname: settingsFullname, phonenumber: settingsPhone, email: settingsEmail });
    } catch (err) {
      setSettingsError(err.message);
    }
  }

  async function clearHistory() {
    if (!window.confirm("Clear your booking history? This will remove your past bookings and tickets.")) return;
    try {
      await Promise.all(historyBookings.map((b) => api.delete(`/tickets/${b.id}`)));
      const data = await api.get("/tickets/my");
      setMyBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || "Could not clear history.");
    }
  }

  const filteredEvents = getFilteredEvents();

  const todayStr = new Date().toISOString().slice(0, 10);

  const historyBookings = myBookings;
  const historyAttended = myBookings.filter((b) => b.scanned).length;
  const totalTickets = myBookings.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  const totalSpent = myBookings.reduce((s, b) => s + (Number(b.unitPrice) || 0) * (Number(b.quantity) || 0), 0);
  const historySpent = totalSpent;
  const attendedCount = myBookings.filter((b) => b.scanned).length;
  const upcomingCount = myBookings.filter((b) => String(b.eventStartDate || "").slice(0, 10) >= todayStr).length;

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.background,
        backgroundImage: `url(${BACKGROUND_IMAGES[currentBgIndex]})`,
        transition: 'background-image 3s ease-in-out',
      }} />
      <div style={styles.overlay} />

      {/* ✅ Attractive Hero Section */}
      <div style={styles.hero}>
        {showBack && (
          <div style={{ width: "100%", maxWidth: 800, textAlign: "left", marginBottom: 16 }}>
            <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>
          </div>
        )}
        {activeTab === 'events' && (
          <div style={styles.heroContent}>
            <div style={styles.heroBadge}>
              <span style={styles.heroBadgeIcon}>🔥</span>
              Trending Events
            </div>
            <h1 style={styles.heroTitle}>
              Discover <span style={styles.heroHighlight}>Amazing</span> Events
            </h1>
            <p style={styles.heroSubtitle}>
              Find and book the best events in <span style={styles.heroSubHighlight}>Ethiopia</span>
            </p>
            <div style={styles.heroButtons}>
              <button style={styles.heroBtn} onClick={() => document.getElementById('eventsSection').scrollIntoView({ behavior: 'smooth' })}>
                Explore Events →
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'events' && (
        <>
          <div style={styles.searchSection} id="eventsSection">
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search events by title, location, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button style={styles.clearSearch} onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>

            <div style={styles.dateSearchRow}>
              <label style={styles.dateSearchLabel}>From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={styles.dateInput}
                title="Events starting from this date"
              />
              <label style={styles.dateSearchLabel}>To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={styles.dateInput}
                title="Events up to this date"
              />
              {(dateFrom || dateTo) && (
                <button style={styles.clearSearch} onClick={() => { setDateFrom(""); setDateTo(""); }} title="Clear dates">
                  ✕ Clear dates
                </button>
              )}
            </div>
          </div>

          <div style={styles.categoriesSection}>
            <div style={styles.categoriesWrapper}>
              {categories.map((category) => (
                <button
                  key={category}
                  style={{
                    ...styles.categoryBtn,
                    ...(selectedCategory === category ? styles.categoryBtnActive : {}),
                  }}
                  onClick={() => setSelectedCategory(category)}
                >
                  {CATEGORY_ICONS[category]} {category}
                </button>
              ))}
            </div>

            <div style={styles.eventsContainer}>
              {loading ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>⏳</span>
                  <h3 style={styles.emptyTitle}>Loading Events...</h3>
                  <p style={styles.emptyText}>Fetching the latest approved events.</p>
                </div>
              ) : filteredEvents.length > 0 ? (
                <div style={styles.eventsGrid}>
                  {filteredEvents.map((event, index) => (
                    <div key={event.id} style={styles.eventCard}>
                      <div style={{
                        ...styles.eventImage,
                        backgroundImage: `url(${getEventImage(event, index)})`,
                      }} />
                      <div style={styles.eventContent}>
                        <div style={styles.eventHeader}>
                          <div style={styles.eventBadge}>
                            {CATEGORY_ICONS[event.category] || "🎟️"} {event.category}
                          </div>
                          <button 
                            style={styles.favoriteBtn}
                            onClick={() => toggleFavorite(event.id)}
                          >
                            {favorites.includes(event.id) ? '❤️' : '🤍'}
                          </button>
                        </div>
                        <h3 style={styles.eventTitle}>{event.title}</h3>
                        <p style={styles.eventDescription}>{event.description}</p>
                        <div style={styles.eventDetails}>
                          <span style={styles.eventDetail}>📅 {formatDateStr(event.startDate)}</span>
                          <span style={styles.eventDetail}>📍 {event.location}</span>
                        </div>
                        <div style={styles.eventDetails}>
                          <span style={styles.eventDetail}>🎫 {getAvailable(event)} left</span>
                          {Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
                            <span style={styles.eventDetail}>
                              🎟️ {event.ticketTiers.map((t) => t.name).join(" · ")}
                            </span>
                          )}
                        </div>
                        <div style={styles.eventFooter}>
                          <span style={styles.eventPrice}>
                            {(() => {
                              const minTier = getMinTierPrice(event);
                              if (minTier !== null) return `From ETB ${minTier}`;
                              return event.price === 0 ? 'Free' : `birr ${event.price}`;
                            })()}
                          </span>
                          <button 
                            style={styles.bookBtn}
                            onClick={() => handleBookTicket(event)}
                          >
                            Book Ticket 🎟️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🔍</span>
                  <h3 style={styles.emptyTitle}>No Events Found</h3>
                  <p style={styles.emptyText}>
                    {searchQuery ? `No events matching "${searchQuery}"` : `No events in "${selectedCategory}" category`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'bookings' && (
        <div style={styles.bookingsSection}>
          <h2 style={styles.sectionTitle}>🎫 My Bookings</h2>
          {!user ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🔐</span>
              <h3 style={styles.emptyTitle}>Sign in to view your bookings</h3>
              <p style={styles.emptyText}>Log in to see your tickets, QR codes and attendance.</p>
              <button style={styles.bookBtn} onClick={() => navigate("/login")}>Sign In</button>
            </div>
          ) : myBookings.length > 0 ? (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{totalTickets}</span>
                  <span style={styles.statLabel}>Tickets Booked</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>ETB {totalSpent.toFixed(2)}</span>
                  <span style={styles.statLabel}>Total Spent</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{attendedCount}</span>
                  <span style={styles.statLabel}>Attended</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{upcomingCount}</span>
                  <span style={styles.statLabel}>Upcoming</span>
                </div>
              </div>
              <div style={styles.bookingsGrid}>
                {myBookings.map((booking) => (
                  <div key={booking.id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <h4 style={styles.bookingTitle}>{booking.eventTitle}</h4>
                      <span className={`status-badge ${booking.scanned ? "status-approved" : "status-pending"}`}>
                        {booking.scanned ? "Attended" : "Not yet attended"}
                      </span>
                    </div>
                    <div style={styles.bookingDetails}>
                      <p>📅 {formatDateStr(booking.eventStartDate)}{booking.eventEndDate ? ` - ${formatDateStr(booking.eventEndDate)}` : ""}</p>
                      <p>📍 {booking.eventLocation}</p>
                      <p>🎫 {booking.quantity} ticket(s) · {booking.tier || "General"}</p>
                      <p>💰 ETB {((booking.unitPrice || 0) * booking.quantity).toFixed(2)}</p>
                      <p>📅 Booked on {formatDateStr(booking.bookingDate)}</p>
                    </div>
                    <button 
                      style={styles.viewTicketBtn}
                      onClick={() => navigate("/my-bookings")}
                    >
                      🎫 Manage / QR
                    </button>
                  </div>
                ))}
              </div>
              <button 
                style={styles.viewTicketBtn}
                onClick={() => navigate("/my-bookings")}
              >
                View All Bookings →
              </button>
            </>
          ) : (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <h3 style={styles.emptyTitle}>No Bookings Yet</h3>
              <p style={styles.emptyText}>You haven't booked any events yet. Start exploring!</p>
              <button style={styles.bookBtn} onClick={() => setSearchParams({})}>Explore Events</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div style={styles.bookingsSection}>
          <h2 style={styles.sectionTitle}>❤️ My Favorite Events</h2>
          {favorites.length > 0 ? (
            <div style={styles.eventsGrid}>
              {events.filter(e => favorites.includes(e.id)).map((event, index) => (
                <div key={event.id} style={styles.eventCard}>
                  <div style={{
                    ...styles.eventImage,
                    backgroundImage: `url(${getEventImage(event, index)})`,
                  }} />
                  <div style={styles.eventContent}>
                    <div style={styles.eventHeader}>
                      <div style={styles.eventBadge}>
                        {CATEGORY_ICONS[event.category] || "🎟️"} {event.category}
                      </div>
                      <button 
                        style={styles.favoriteBtn}
                        onClick={() => toggleFavorite(event.id)}
                      >
                        ❤️
                      </button>
                    </div>
                    <h3 style={styles.eventTitle}>{event.title}</h3>
                    <p style={styles.eventDescription}>{event.description}</p>
                    <div style={styles.eventDetails}>
                      <span style={styles.eventDetail}>📅 {formatDateStr(event.startDate)}</span>
                      <span style={styles.eventDetail}>📍 {event.location}</span>
                    </div>
                    <div style={styles.eventDetails}>
                      <span style={styles.eventDetail}>🎫 {getAvailable(event)} left</span>
                      {Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
                        <span style={styles.eventDetail}>
                          🎟️ {event.ticketTiers.map((t) => t.name).join(" · ")}
                        </span>
                      )}
                    </div>
                    <div style={styles.eventFooter}>
                      <span style={styles.eventPrice}>
                        {(() => {
                          const minTier = getMinTierPrice(event);
                          if (minTier !== null) return `From ETB ${minTier}`;
                          return event.price === 0 ? 'Free' : `birr ${event.price}`;
                        })()}
                      </span>
                      <button 
                        style={styles.bookBtn}
                        onClick={() => handleBookTicket(event)}
                      >
                        Book Ticket 🎟️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>💔</span>
              <h3 style={styles.emptyTitle}>No Favorites Yet</h3>
              <p style={styles.emptyText}>Start adding events to your favorites by clicking the heart icon!</p>
            </div>
          )}
          <button 
            style={styles.clearFavoritesBtn}
            onClick={() => {
              if (window.confirm("Clear all favorites?")) {
                setFavorites([]);
                localStorage.setItem("favorites", JSON.stringify([]));
                setShowFavoriteOnly(false);
                setSearchParams({});
              }
            }}
          >
            Clear All Favorites
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={styles.bookingsSection}>
          <h2 style={styles.sectionTitle}>🕘 History</h2>
          {!user ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🔐</span>
              <h3 style={styles.emptyTitle}>Sign in to view your history</h3>
              <p style={styles.emptyText}>Log in to see the events you attended in the past.</p>
              <button style={styles.bookBtn} onClick={() => navigate("/login")}>Sign In</button>
            </div>
          ) : historyBookings.length > 0 ? (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{historyBookings.length}</span>
                  <span style={styles.statLabel}>Total Bookings</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{upcomingCount}</span>
                  <span style={styles.statLabel}>Upcoming</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{historyAttended}</span>
                  <span style={styles.statLabel}>Attended</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>ETB {historySpent.toFixed(2)}</span>
                  <span style={styles.statLabel}>Total Spent</span>
                </div>
              </div>
              <div style={styles.bookingsGrid}>
                {historyBookings.map((booking) => {
                  const isUpcoming = String(booking.eventStartDate || "").slice(0, 10) >= todayStr;
                  const status = booking.scanned ? "Attended" : isUpcoming ? "Upcoming" : "Missed";
                  return (
                    <div key={booking.id} style={styles.bookingCard}>
                      <div style={styles.bookingHeader}>
                        <h4 style={styles.bookingTitle}>{booking.eventTitle}</h4>
                        <span className={`status-badge ${booking.scanned ? "status-approved" : "status-pending"}`}>
                          {status}
                        </span>
                      </div>
                      <div style={styles.bookingDetails}>
                        <p>📅 {formatDateStr(booking.eventStartDate)}{booking.eventEndDate ? ` - ${formatDateStr(booking.eventEndDate)}` : ""}</p>
                        <p>📍 {booking.eventLocation}</p>
                        <p>🎫 {booking.quantity} ticket(s) · {booking.tier || "General"}</p>
                        <p>💰 ETB {((booking.unitPrice || 0) * booking.quantity).toFixed(2)}</p>
                        <p>📅 Booked on {formatDateStr(booking.bookingDate)}</p>
                      </div>
                      <button
                        style={styles.viewTicketBtn}
                        onClick={() => navigate("/my-bookings")}
                      >
                        🎫 Manage / QR
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                style={styles.clearFavoritesBtn}
                onClick={clearHistory}
              >
                🗑 Clear History
              </button>
            </>
          ) : (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🗓</span>
              <h3 style={styles.emptyTitle}>No Past Events Yet</h3>
              <p style={styles.emptyText}>Events that already ended (or you attended) will show up here.</p>
              <button style={styles.bookBtn} onClick={() => setSearchParams({})}>Explore Events</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={styles.bookingsSection}>
          <h2 style={styles.sectionTitle}>⚙️ Settings</h2>
          {!user ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🔐</span>
              <h3 style={styles.emptyTitle}>Sign in to edit your information</h3>
              <p style={styles.emptyText}>Log in to update your name, phone number and email.</p>
              <button style={styles.bookBtn} onClick={() => navigate("/login")}>Sign In</button>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} style={styles.settingsForm}>
              {settingsMessage && (
                <div style={{ ...styles.settingsMsg, color: '#4CAF50', borderColor: 'rgba(76,175,80,0.3)' }}>{settingsMessage}</div>
              )}
              {settingsError && (
                <div style={{ ...styles.settingsMsg, color: '#ff4757', borderColor: 'rgba(255,71,87,0.3)' }}>{settingsError}</div>
              )}
              <div style={styles.settingsField}>
                <label style={styles.settingsLabel}>Full Name</label>
                <input
                  type="text"
                  value={settingsFullname}
                  onChange={(e) => setSettingsFullname(e.target.value)}
                  style={styles.settingsInput}
                  required
                />
              </div>
              <div style={styles.settingsField}>
                <label style={styles.settingsLabel}>Phone Number</label>
                <input
                  type="tel"
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  style={styles.settingsInput}
                  required
                />
              </div>
              <div style={styles.settingsField}>
                <label style={styles.settingsLabel}>Email</label>
                <input
                  type="email"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  style={styles.settingsInput}
                  required
                />
              </div>
              <button type="submit" style={styles.bookBtn}>Save Changes</button>
            </form>
          )}
        </div>
      )}

      {/* Time Widget */}
      <div style={styles.widget}>
        <div style={styles.timeWidget}>
          <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>
          <span style={styles.dateDisplay}>{formatDate(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    fontFamily: 'Segoe UI, sans-serif',
    paddingBottom: '100px',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'top center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    margin: '0 auto 28px',
    position: 'relative',
    zIndex: 2,
    background: '#1b1b2f',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '8px',
    borderRadius: '999px',
    maxWidth: 'fit-content',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  tabDefault: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
    padding: '8px 20px',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'all 0.18s',
  },
  tabActive: {
    border: 'none',
    background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)',
    color: '#ffffff',
    padding: '8px 20px',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(108, 92, 231, 0.4)',
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'all 0.18s',
  },
  // ✅ Attractive Hero Section
  hero: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px 30px 20px',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: '800px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    background: 'rgba(255, 107, 107, 0.15)',
    border: '1px solid rgba(255, 107, 107, 0.2)',
    borderRadius: '50px',
    color: '#FF6B6B',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  heroBadgeIcon: {
    fontSize: '16px',
  },
  heroTitle: {
    color: 'white',
    fontSize: '52px',
    fontWeight: 'bold',
    lineHeight: '1.1',
    marginBottom: '8px',
    textShadow: '0 4px 30px rgba(0,0,0,0.3)',
  },
  heroHighlight: {
    background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '24px',
    fontWeight: '400',
    marginBottom: '20px',
  },
  heroSubHighlight: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  heroButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  heroBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
    border: 'none',
    borderRadius: '50px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
  },
  tabContainer: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 50px',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(5px)',
  },
  tab: {
    padding: '8px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    background: 'rgba(255, 107, 107, 0.2)',
    border: '1px solid #FF6B6B',
    color: 'white',
  },
  searchSection: {
    position: 'relative',
    zIndex: 2,
    padding: '15px 50px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '50px',
    padding: '8px 20px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  searchIcon: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.5)',
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    padding: '10px 0',
    outline: 'none',
  },
  clearSearch: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px 8px',
  },
  dateInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'white',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    colorScheme: 'dark',
  },
  dateSearchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  dateSearchLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    fontWeight: '600',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '15px',
    marginBottom: '25px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '18px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
  },
  statValue: {
    display: 'block',
    color: 'white',
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  settingsForm: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  settingsField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  settingsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: '600',
  },
  settingsInput: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
  },
  settingsMsg: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    border: '1px solid',
    background: 'rgba(255,255,255,0.05)',
  },
  categoriesSection: {
    position: 'relative',
    zIndex: 2,
    padding: '10px 50px 30px 50px',
  },
  categoriesWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '20px',
    padding: '12px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  categoryBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '25px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  categoryBtnActive: {
    background: 'rgba(255, 107, 107, 0.3)',
    border: '1px solid #FF6B6B',
    color: 'white',
    transform: 'scale(1.05)',
  },
  eventsContainer: {
    minHeight: '250px',
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  eventCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  eventImage: {
    height: '180px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  eventContent: {
    padding: '16px',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  eventBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: 'rgba(255, 107, 107, 0.2)',
    color: '#FF6B6B',
  },
  favoriteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    transition: 'transform 0.2s ease',
  },
  eventTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  eventDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  eventDetails: {
    display: 'flex',
    gap: '12px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  eventDetail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
  },
  eventFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  eventPrice: {
    color: '#4CAF50',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  bookBtn: {
    background: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
    border: 'none',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  bookingsSection: {
    position: 'relative',
    zIndex: 2,
    padding: '20px 50px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sectionTitle: {
    color: 'white',
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '15px',
  },
  bookingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px',
  },
  bookingCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  bookingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  bookingTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  bookingStatus: {
    color: '#4CAF50',
    fontSize: '12px',
  },
  bookingDetails: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
  },
  viewTicketBtn: {
    marginTop: '12px',
    padding: '6px 16px',
    background: 'rgba(100, 149, 237, 0.2)',
    border: '1px solid rgba(100, 149, 237, 0.2)',
    borderRadius: '20px',
    color: '#6495ED',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  clearFavoritesBtn: {
    marginTop: '16px',
    padding: '8px 20px',
    background: 'rgba(255, 68, 68, 0.15)',
    border: '1px solid rgba(255, 68, 68, 0.2)',
    borderRadius: '20px',
    color: '#ff4444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  clearHistoryBtn: {
    marginTop: '16px',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
    border: 'none',
    borderRadius: '999px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(255, 71, 87, 0.4)',
    transition: 'all 0.2s ease',
  },
  clearHistoryBtn: {
    marginTop: '16px',
    padding: '8px 20px',
    background: 'rgba(255, 68, 68, 0.15)',
    border: '1px solid rgba(255, 68, 68, 0.2)',
    borderRadius: '20px',
    color: '#ff4444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '15px',
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ✅ Booking Modal - White background, black text
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '450px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid #e9ecef',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    color: '#1a1a2e',
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  modalEventInfo: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fc',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  modalEventTitle: {
    color: '#1a1a2e',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  modalEventText: {
    color: '#333',
    fontSize: '14px',
    margin: '4px 0',
  },
  modalForm: {
    marginBottom: '20px',
  },
  modalLabel: {
    color: '#1a1a2e',
    fontSize: '14px',
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  qtyBtn: {
    background: '#f0f0f0',
    border: '1px solid #ddd',
    color: '#333',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease',
  },
  qtyInput: {
    background: 'white',
    border: '1px solid #ddd',
    color: '#333',
    width: '60px',
    height: '36px',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '16px',
  },
  remainingTickets: {
    color: '#555',
    fontSize: '13px',
    marginTop: '8px',
    padding: '8px',
    background: '#f8f9fc',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  totalPrice: {
    color: '#1a1a2e',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '10px',
    background: 'rgba(76, 175, 80, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(76, 175, 80, 0.2)',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '10px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    color: '#333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  modalConfirmBtn: {
    flex: 2,
    padding: '10px',
    background: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  // ✅ Payment Modal - Black text
  paymentSummary: {
    background: '#f8f9fc',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e9ecef',
  },
  paymentSummaryText: {
    color: '#333',
    fontSize: '14px',
    margin: '4px 0',
  },
  paymentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  paymentLabel: {
    color: '#1a1a2e',
    fontSize: '13px',
    fontWeight: '600',
  },
  input: {
    padding: '10px 14px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    color: '#333',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  inputError: {
    borderColor: '#ff4444 !important',
  },
  errorText: {
    color: '#ff4444',
    fontSize: '12px',
    marginTop: '4px',
  },
  phoneHint: {
    color: '#888',
    fontSize: '12px',
    marginTop: '4px',
  },
  paymentMethodContainer: {
    display: 'flex',
    gap: '10px',
  },
  paymentMethodBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f8f9fc',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  paymentMethodBtnActive: {
    background: 'rgba(255, 107, 107, 0.1)',
    border: '2px solid #FF6B6B',
  },
  paymentIcon: {
    fontSize: '28px',
  },
  paymentLabel: {
    color: '#1a1a2e',
    fontSize: '14px',
    fontWeight: '600',
  },
  paymentUnavailable: {
    color: '#ff4757',
    fontSize: '10px',
    fontWeight: '600',
    marginTop: '2px',
  },
  paymentDesc: {
    color: '#888',
    fontSize: '11px',
  },
  paymentActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  payBtn: {
    flex: 2,
    padding: '12px',
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  ticketModal: {
    background: 'rgba(20,20,40,0.95)',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '480px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  ticketContainer: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  ticketIcon: {
    fontSize: '24px',
  },
  ticketNumber: {
    color: '#FF6B6B',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  ticketBody: {
    color: 'white',
  },
  ticketEvent: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: 'white',
  },
  ticketDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    margin: '4px 0',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '15px 0',
    margin: '10px 0',
    background: 'white',
    borderRadius: '8px',
  },
  qrLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    marginTop: '5px',
  },
  ticketActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  downloadBtn: {
    flex: 1,
    padding: '10px',
    background: 'rgba(100, 149, 237, 0.2)',
    border: '1px solid rgba(100, 149, 237, 0.2)',
    borderRadius: '8px',
    color: '#6495ED',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  closeTicketBtn: {
    marginTop: '15px',
    padding: '10px',
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    fontSize: '14px',
  },
  successModal: {
    background: 'rgba(20,20,40,0.95)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  successIcon: {
    fontSize: '56px',
    display: 'block',
    marginBottom: '15px',
  },
  successTitle: {
    color: '#4CAF50',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  successText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '16px',
  },
  widget: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    zIndex: 3,
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'white',
  },
  timeWidget: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timeDisplay: {
    fontSize: '18px',
    fontWeight: '600',
  },
  dateDisplay: {
    opacity: 0.6,
    fontSize: '13px',
  },
};

// Hover styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .sign-in-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.6);
  }
  .sign-up-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(108, 92, 231, 0.4);
  }
  .category-btn:hover {
    background: rgba(255,255,255,0.2);
    transform: scale(1.05);
  }
  .book-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }
  .event-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  }
  .logout-btn:hover {
    background: rgba(255, 68, 68, 0.25);
    color: white;
  }
  .tab:hover {
    background: rgba(255,255,255,0.1);
  }
  .favorite-btn:hover {
    transform: scale(1.2);
  }
  .view-ticket-btn:hover {
    background: rgba(100, 149, 237, 0.3);
  }
  .download-btn:hover {
    background: rgba(100, 149, 237, 0.3);
  }
  .pay-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  }
  .clear-favorites-btn:hover {
    background: rgba(255, 68, 68, 0.25);
  }
  .clear-history-btn:hover {
    background: rgba(255, 68, 68, 0.25);
  }
  .payment-method-btn:hover {
    background: rgba(255,255,255,0.1);
  }
  .qty-btn:hover {
    background: #6c5ce7;
    color: white;
    border-color: #6c5ce7;
  }
  .modal-cancel-btn:hover {
    background: #e0e0e0;
  }
  .modal-confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }
  .hero-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(255, 107, 107, 0.4);
  }
`;
document.head.appendChild(styleSheet);