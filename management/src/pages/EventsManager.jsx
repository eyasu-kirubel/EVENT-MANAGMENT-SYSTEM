import { useState, useEffect } from "react";

export default function EventsManager() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Music", location: "", price: "", capacity: "", startDate: "", endDate: "", image: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchEvents = () => {
    const url = filter === "all" ? "/api/events/all" : `/api/events?status=${filter}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchEvents(); }, [filter]);

  const resetForm = () => {
    setForm({ title: "", description: "", category: "Music", location: "", price: "", capacity: "", startDate: "", endDate: "", image: "" });
    setEditingEvent(null);
    setShowForm(false);
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
    const body = { ...form, price: Number(form.price), capacity: Number(form.capacity) };
    const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
    const method = editingEvent ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: "success", text: editingEvent ? "Event updated!" : "Event created!" });
      resetForm();
      fetchEvents();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`/api/events/${id}/${action}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: "success", text: data.message });
      fetchEvents();
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
      fetchEvents();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div style={styles.toolbar}>
        <div style={styles.filters}>
          {["all", "approved", "pending", "rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              ...styles.filterBtn,
              background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? 'white' : 'rgba(255,255,255,0.6)',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={styles.addBtn}>
          {showForm ? "✕ Close" : "+ New Event"}
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

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>{editingEvent ? "Edit Event" : "Create Event"}</h3>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={styles.input} required />
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
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Price (ETB)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Capacity</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={styles.input} />
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
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...styles.input, minHeight: 80 }} />
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.submitBtn}>{editingEvent ? "Update" : "Create"}</button>
          </div>
        </form>
      )}

      {/* EVENTS TABLE */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Event</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: '32px' }}>No events found.</td></tr>
            ) : events.map((event) => (
              <tr key={event.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.eventCell}>
                    <img src={event.image} alt="" style={styles.eventThumb} />
                    <div>
                      <div style={styles.eventName}>{event.title}</div>
                      <div style={styles.eventLoc}>📍 {event.location}</div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>{event.category}</td>
                <td style={styles.td}>{event.startDate}</td>
                <td style={styles.td}>ETB {event.price.toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: event.status === 'approved' ? 'rgba(16,185,129,0.15)' : event.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: event.status === 'approved' ? '#6ee7b7' : event.status === 'pending' ? '#fcd34d' : '#fca5a5',
                  }}>{event.status}</span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    {event.status === "pending" && (
                      <>
                        <button onClick={() => handleAction(event.id, "approve")} style={styles.approveBtn}>✓</button>
                        <button onClick={() => handleAction(event.id, "reject")} style={styles.rejectBtn}>✕</button>
                      </>
                    )}
                    <button onClick={() => handleEdit(event)} style={styles.editBtn}>✎</button>
                    <button onClick={() => handleDelete(event.id)} style={styles.deleteBtn}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  filters: { display: 'flex', gap: 6 },
  filterBtn: { border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  addBtn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  msg: { padding: '10px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  msgClose: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' },

  form: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '24px', marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  formTitle: { gridColumn: '1 / -1', fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: 4 },
  formField: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '14px', outline: 'none' },
  formActions: { gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  submitBtn: { background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' },
  td: { padding: '10px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', verticalAlign: 'middle' },
  eventCell: { display: 'flex', alignItems: 'center', gap: 12 },
  eventThumb: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover' },
  eventName: { fontWeight: 600, color: 'white', fontSize: '14px' },
  eventLoc: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' },
  actions: { display: 'flex', gap: 6 },
  approveBtn: { width: 30, height: 30, borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '14px' },
  rejectBtn: { width: 30, height: 30, borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '14px' },
  editBtn: { width: 30, height: 30, borderRadius: '6px', background: 'rgba(59,130,246,0.15)', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '14px' },
  deleteBtn: { width: 30, height: 30, borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '14px' },
};
