import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OrganizerPanel() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("events");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    title: "", description: "", category: "Music", location: "",
    price: "", capacity: "", startDate: "", endDate: "", image: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      if (parsed.role !== "organizer") { navigate("/login"); return; }
      fetchEvents(parsed.id);
    } else {
      navigate("/login");
    }
  }, []);

  const fetchEvents = (orgId) => {
    setLoading(true);
    fetch(`/api/events?organizerId=${orgId}`)
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ title: "", description: "", category: "Music", location: "", price: "", capacity: "", startDate: "", endDate: "", image: "" });
    setEditingEvent(null);
    setShowForm(false);
    setMsg({ type: "", text: "" });
  };

  const handleEdit = (event) => {
    setForm({
      title: event.title, description: event.description || "", category: event.category,
      location: event.location || "", price: event.price, capacity: event.capacity,
      startDate: event.startDate, endDate: event.endDate, image: event.image || "",
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), capacity: Number(form.capacity), organizerId: user.id };
    const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
    const method = editingEvent ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: "success", text: editingEvent ? "Event updated!" : "Event submitted for approval!" });
      resetForm();
      fetchEvents(user.id);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: "success", text: "Event deleted!" });
      fetchEvents(user.id);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const approved = events.filter((e) => e.status === "approved");
  const pending = events.filter((e) => e.status === "pending");
  const rejected = events.filter((e) => e.status === "rejected");

  return (
    <div style={styles.page}>
      {/* VIDEO BG */}
      <div style={styles.videoBg}>
        <video autoPlay loop muted playsInline style={styles.video}
          poster="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80">
          <source src="https://cdn.pixabay.com/video/2020/07/30/45675-444601765_large.mp4" type="video/mp4" />
        </video>
        <div style={styles.overlay} />
      </div>

      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <span style={styles.logo}>🎪 EventHub Organizer</span>
          <div style={styles.navLinks}>
            <span style={styles.userBadge}>👋 {user?.fullname}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={styles.container}>
        {/* STATS */}
        <div style={styles.stats}>
          <div onClick={() => setActiveTab("events")} style={{ ...styles.statCard, cursor: 'pointer', borderColor: activeTab === "events" ? 'var(--primary)' : 'transparent' }}>
            <span style={{ fontSize: 24 }}>📅</span>
            <span style={styles.statNum}>{events.length}</span>
            <span style={styles.statLabel}>Total Events</span>
          </div>
          <div onClick={() => setActiveTab("approved")} style={{ ...styles.statCard, cursor: 'pointer', borderColor: activeTab === "approved" ? '#10b981' : 'transparent' }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <span style={styles.statNum}>{approved.length}</span>
            <span style={styles.statLabel}>Approved</span>
          </div>
          <div onClick={() => setActiveTab("pending")} style={{ ...styles.statCard, cursor: 'pointer', borderColor: activeTab === "pending" ? '#f59e0b' : 'transparent' }}>
            <span style={{ fontSize: 24 }}>⏳</span>
            <span style={styles.statNum}>{pending.length}</span>
            <span style={styles.statLabel}>Pending</span>
          </div>
          <div onClick={() => setActiveTab("rejected")} style={{ ...styles.statCard, cursor: 'pointer', borderColor: activeTab === "rejected" ? '#ef4444' : 'transparent' }}>
            <span style={{ fontSize: 24 }}>❌</span>
            <span style={styles.statNum}>{rejected.length}</span>
            <span style={styles.statLabel}>Rejected</span>
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            {[
              { key: "events", label: "All Events" },
              { key: "approved", label: "Approved" },
              { key: "pending", label: "Pending" },
              { key: "rejected", label: "Rejected" },
            ].map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                ...styles.tabBtn,
                background: activeTab === t.key ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeTab === t.key ? 'white' : 'rgba(255,255,255,0.6)',
              }}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={styles.addBtn}>
            {showForm ? "✕ Close" : "+ Create Event"}
          </button>
        </div>

        {msg.text && (
          <div style={{
            ...styles.msg,
            background: msg.type === "success" ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: msg.type === "success" ? '#6ee7b7' : '#fca5a5',
          }}>
            {msg.text}
            <button onClick={() => setMsg({ type: "", text: "" })} style={styles.msgClose}>✕</button>
          </div>
        )}

        {/* CREATE / EDIT FORM */}
        {showForm && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <h3 style={styles.formTitle}>{editingEvent ? "Edit Event" : "Create New Event"}</h3>
            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.label}>Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={styles.input} placeholder="Event title" required />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input}>
                  {["Music", "Technology", "Food & Art", "Culture", "Sports", "Entertainment", "Workshop", "Fashion", "general"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={styles.input} placeholder="Event venue" />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Price (ETB)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Capacity</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={styles.input} placeholder="100" />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Image URL</label>
                <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} style={styles.input} placeholder="https://..." />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Start Date *</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={styles.input} required />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>End Date *</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={styles.input} required />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...styles.input, minHeight: 80 }} placeholder="Describe your event..." />
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.submitBtn}>{editingEvent ? "Update Event" : "Submit for Approval"}</button>
            </div>
          </form>
        )}

        {/* EVENTS LIST */}
        {loading ? (
          <div style={styles.loading}>Loading your events...</div>
        ) : events.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: 48 }}>📅</span>
            <h3 style={{ color: 'white', margin: '12px 0 4px' }}>No events yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Click "Create Event" to get started</p>
          </div>
        ) : (
          <div style={styles.eventsGrid}>
            {events
              .filter((e) => activeTab === "events" || e.status === activeTab)
              .map((event) => (
                <div key={event.id} style={styles.eventCard}>
                  <div style={styles.cardImageWrap}>
                    <img src={event.image} alt={event.title} style={styles.cardImage} />
                    <span style={{
                      ...styles.statusPill,
                      background: event.status === 'approved' ? '#10b981' : event.status === 'pending' ? '#f59e0b' : '#ef4444',
                    }}>{event.status}</span>
                  </div>
                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{event.title}</h3>
                    <p style={styles.cardDesc}>{event.description}</p>
                    <div style={styles.cardMeta}>
                      <span>📍 {event.location || "TBD"}</span>
                      <span>📅 {event.startDate}{event.startDate !== event.endDate ? ` - ${event.endDate}` : ""}</span>
                      <span>👥 {event.capacity} seats</span>
                      <span>💰 ETB {event.price.toLocaleString()}</span>
                    </div>
                    <div style={styles.cardActions}>
                      <button onClick={() => handleEdit(event)} style={styles.editBtn}>✎ Edit</button>
                      <button onClick={() => handleDelete(event.id)} style={styles.deleteBtn}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', position: 'relative' },
  videoBg: { position: 'fixed', inset: 0, zIndex: 0 },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(15, 10, 26, 0.88)' },

  navbar: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,10,26,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' },
  navContent: { maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '20px', fontWeight: 'bold', color: 'white' },
  navLinks: { display: 'flex', gap: '16px', alignItems: 'center' },
  userBadge: { color: 'var(--text-muted)', fontSize: '14px' },
  logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '6px 14px', borderRadius: 8, fontSize: '13px', cursor: 'pointer' },

  container: { position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },

  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '18px', background: 'rgba(20,15,35,0.8)', backdropFilter: 'blur(10px)', border: '2px solid transparent', borderRadius: 12, transition: 'border-color 0.2s' },
  statNum: { fontSize: '26px', fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.5)' },

  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tabBtn: { border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 8, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  addBtn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  msg: { padding: '10px 16px', borderRadius: 8, fontSize: '14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  msgClose: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' },

  form: { background: 'rgba(20,15,35,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24, marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  formTitle: { gridColumn: '1 / -1', fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 4 },
  formField: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none' },
  formActions: { gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '8px 18px', borderRadius: 8, fontSize: '14px', cursor: 'pointer' },
  submitBtn: { background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  loading: { textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.5)' },
  emptyState: { textAlign: 'center', padding: 60, background: 'rgba(20,15,35,0.7)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' },

  eventsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  eventCard: { background: 'rgba(20,15,35,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.2s' },
  cardImageWrap: { position: 'relative', height: 180 },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover' },
  statusPill: { position: 'absolute', top: 10, right: 10, color: 'white', padding: '3px 12px', borderRadius: 20, fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' },
  cardBody: { padding: 18 },
  cardTitle: { fontSize: '17px', fontWeight: 'bold', color: 'white', marginBottom: 6 },
  cardDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: 14 },
  cardActions: { display: 'flex', gap: 8 },
  editBtn: { flex: 1, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd', padding: '7px 14px', borderRadius: 8, fontSize: '13px', cursor: 'pointer', fontWeight: 500 },
  deleteBtn: { flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', padding: '7px 14px', borderRadius: 8, fontSize: '13px', cursor: 'pointer', fontWeight: 500 },
};
