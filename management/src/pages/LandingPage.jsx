import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [events, setEvents] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = [
    { icon: "🎵", name: "Music" },
    { icon: "💻", name: "Technology" },
    { icon: "🍽️", name: "Food & Art" },
    { icon: "🎭", name: "Culture" },
    { icon: "🏃", name: "Sports" },
    { icon: "😂", name: "Entertainment" },
  ];

  return (
    <div style={styles.page}>
      {/* HERO SECTION WITH VIDEO */}
      <div style={styles.heroContainer}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={styles.video}
          poster="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80"
        >
          <source
            src="https://cdn.pixabay.com/video/2020/07/30/45675-444601765_large.mp4"
            type="video/mp4"
          />
        </video>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={{
            ...styles.heroInner,
            transform: `translateY(${scrollY * 0.3}px)`,
            opacity: Math.max(0, 1 - scrollY / 600),
          }}>
            <h1 style={styles.heroTitle}>
              Discover & Book<br />
              <span style={styles.heroAccent}>Amazing Events</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Your premier destination for event management and ticketing in Addis Ababa.
              Find concerts, conferences, festivals, and more.
            </p>
            <div style={styles.heroActions}>
              <button onClick={() => navigate("/events")} style={styles.btnPrimary}>
                Browse Events
              </button>
              <button onClick={() => navigate("/register")} style={styles.btnSecondary}>
                Get Started
              </button>
            </div>
            <div style={styles.heroStats}>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>50+</span>
                <span style={styles.statLabel}>Events</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statNumber}>10K+</span>
                <span style={styles.statLabel}>Attendees</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statNumber}>100+</span>
                <span style={styles.statLabel}>Organizers</span>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.scrollIndicator}>
          <span style={styles.scrollArrow}>↓</span>
        </div>
      </div>

      {/* NAVBAR (fixed on scroll) */}
      <nav style={{
        ...styles.navbar,
        background: scrollY > 50 ? 'rgba(15, 10, 26, 0.95)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
      }}>
        <div style={styles.navContent}>
          <span style={styles.logo}>🎪 EventHub</span>
          <div style={styles.navLinks}>
            <a onClick={() => navigate("/")} style={styles.navLink}>Home</a>
            <a onClick={() => navigate("/events")} style={styles.navLink}>Events</a>
            <a onClick={() => navigate("/login")} style={styles.navLink}>Login</a>
            <button onClick={() => navigate("/register")} style={styles.navBtn}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* CATEGORIES */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Explore Categories</h2>
        <p style={styles.sectionSubtitle}>Find events that match your interests</p>
        <div style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => navigate("/events")}
              style={styles.categoryCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={styles.categoryIcon}>{cat.icon}</span>
              <span style={styles.categoryName}>{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED EVENTS */}
      {events.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Featured Events</h2>
          <p style={styles.sectionSubtitle}>Don't miss out on these upcoming events</p>
          <div style={styles.eventsGrid}>
            {events.map((event) => (
              <div
                key={event.id}
                style={styles.eventCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(124, 58, 237, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                }}
              >
                <div style={styles.eventImageContainer}>
                  <img src={event.image} alt={event.title} style={styles.eventImage} />
                  <span style={styles.eventCategory}>{event.category}</span>
                </div>
                <div style={styles.eventInfo}>
                  <h3 style={styles.eventTitle}>{event.title}</h3>
                  <p style={styles.eventDesc}>{event.description}</p>
                  <div style={styles.eventMeta}>
                    <span>📍 {event.location}</span>
                    <span>📅 {event.startDate}</span>
                  </div>
                  <div style={styles.eventFooter}>
                    <span style={styles.eventPrice}>ETB {event.price.toLocaleString()}</span>
                    <button
                      onClick={() => navigate("/events")}
                      style={styles.bookBtn}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={() => navigate("/events")} style={styles.btnPrimary}>
              View All Events →
            </button>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <p style={styles.sectionSubtitle}>Book your event in 3 simple steps</p>
        <div style={styles.stepsGrid}>
          {[
            { step: "01", icon: "🔍", title: "Browse Events", desc: "Discover upcoming events in Addis Ababa" },
            { step: "02", icon: "🎟️", title: "Book Tickets", desc: "Select your seats and complete payment" },
            { step: "03", icon: "📱", title: "Get QR Code", desc: "Receive your digital ticket with QR code" },
          ].map((s) => (
            <div key={s.step} style={styles.stepCard}>
              <span style={styles.stepNumber}>{s.step}</span>
              <span style={styles.stepIcon}>{s.icon}</span>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div>
            <h3 style={styles.footerLogo}>🎪 EventHub</h3>
            <p style={styles.footerText}>Your premier event management and ticketing platform in Addis Ababa, Ethiopia.</p>
          </div>
          <div style={styles.footerLinks}>
            <a onClick={() => navigate("/")} style={styles.footerLink}>Home</a>
            <a onClick={() => navigate("/events")} style={styles.footerLink}>Events</a>
            <a onClick={() => navigate("/login")} style={styles.footerLink}>Login</a>
            <a onClick={() => navigate("/register")} style={styles.footerLink}>Register</a>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>© 2026 EventHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: { background: 'var(--bg-dark)', minHeight: '100vh' },
  navbar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transition: 'all 0.3s ease', borderBottom: '1px solid var(--border)' },
  navContent: { maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '22px', fontWeight: 'bold', color: 'white' },
  navLinks: { display: 'flex', gap: '24px', alignItems: 'center' },
  navLink: { color: 'var(--text-muted)', cursor: 'pointer', fontSize: '15px', transition: 'color 0.2s', textDecoration: 'none' },
  navBtn: { background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  heroContainer: { position: 'relative', height: '100vh', overflow: 'hidden' },
  video: { position: 'absolute', top: '50%', left: '50%', minWidth: '100%', minHeight: '100%', transform: 'translate(-50%, -50%)', objectFit: 'cover' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,10,26,0.85) 0%, rgba(91,33,182,0.4) 50%, rgba(15,10,26,0.9) 100%)' },
  heroContent: { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 24px' },
  heroInner: { textAlign: 'center', maxWidth: 700 },
  heroTitle: { fontSize: '64px', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-2px' },
  heroAccent: { background: 'linear-gradient(135deg, var(--primary-light), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSubtitle: { fontSize: '18px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' },
  heroActions: { display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: 48 },
  btnPrimary: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'transform 0.2s, box-shadow 0.2s' },
  btnSecondary: { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '14px 32px', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' },
  heroStats: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32 },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNumber: { fontSize: '28px', fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: '13px', color: 'var(--text-muted)', marginTop: 4 },
  statDivider: { width: 1, height: 40, background: 'rgba(255,255,255,0.1)' },
  scrollIndicator: { position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 2 },
  scrollArrow: { fontSize: '24px', color: 'rgba(255,255,255,0.4)', animation: 'bounce 2s infinite' },

  section: { padding: '80px 24px', maxWidth: 1200, margin: '0 auto' },
  sectionTitle: { fontSize: '36px', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  sectionSubtitle: { fontSize: '16px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 48 },

  categoriesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 },
  categoryCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.3s ease' },
  categoryIcon: { fontSize: '36px' },
  categoryName: { fontSize: '15px', fontWeight: 500, color: 'var(--text)' },

  eventsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 },
  eventCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: 'var(--shadow)' },
  eventImageContainer: { position: 'relative', height: 200, overflow: 'hidden' },
  eventImage: { width: '100%', height: '100%', objectFit: 'cover' },
  eventCategory: { position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  eventInfo: { padding: 20 },
  eventTitle: { fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 8 },
  eventDesc: { fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  eventMeta: { display: 'flex', gap: 16, fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 },
  eventFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventPrice: { fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' },
  bookBtn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 },
  stepCard: { textAlign: 'center', padding: '40px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative' },
  stepNumber: { fontSize: '48px', fontWeight: 900, color: 'rgba(124,58,237,0.15)', position: 'absolute', top: 12, right: 20 },
  stepIcon: { fontSize: '40px', display: 'block', marginBottom: 16 },
  stepTitle: { fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 8 },
  stepDesc: { fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 },

  footer: { borderTop: '1px solid var(--border)', padding: '48px 24px 24px' },
  footerContent: { maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 },
  footerLogo: { fontSize: '20px', color: 'white', marginBottom: 8 },
  footerText: { fontSize: '14px', color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.6 },
  footerLinks: { display: 'flex', flexDirection: 'column', gap: 12 },
  footerLink: { color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' },
  footerBottom: { textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 20, color: 'var(--text-muted)', fontSize: '13px' },
};
