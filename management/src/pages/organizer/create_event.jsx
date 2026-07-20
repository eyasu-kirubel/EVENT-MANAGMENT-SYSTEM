import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    location: "",
    price: 0,
    capacity: "",
    startDate: "",
    endDate: "",
    photo: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/events", {
        ...form,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity),
      });
      navigate("/organizer");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Create Event</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="General">General</option>
              <option value="Concert">Concert</option>
              <option value="Seminar">Seminar</option>
              <option value="Workshop">Workshop</option>
              <option value="Conference">Conference</option>
              <option value="Sports">Sports</option>
              <option value="Exhibition">Exhibition</option>
              <option value="Networking">Networking</option>
            </select>
          </div>

          <div className="form-group">
            <label>Price (ETB)</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" />
          </div>
        </div>

        <div className="form-group">
          <label>Location *</label>
          <input type="text" name="location" value={form.location} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Capacity *</label>
            <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" required />
          </div>
          <div className="form-group">
            <label>Photo URL</label>
            <input type="text" name="photo" value={form.photo} onChange={handleChange} placeholder="https://..." />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
