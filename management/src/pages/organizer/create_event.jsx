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
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "startDate" && form.endDate && value > form.endDate) {
      setErrors((prev) => ({ ...prev, endDate: "End date must be after start date" }));
    }
    if (name === "endDate" && form.startDate && value < form.startDate) {
      setErrors((prev) => ({ ...prev, endDate: "End date must be after start date" }));
    }
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, photo: "Please select an image file" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: "Image must be under 5MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, photo: ev.target.result }));
      setPhotoPreview(ev.target.result);
      setErrors((prev) => ({ ...prev, photo: "" }));
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.location.trim()) errs.location = "Location is required";
    if (!form.capacity || parseInt(form.capacity) < 1) errs.capacity = "Capacity must be at least 1";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.endDate) errs.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = "End date must be after start date";
    }
    if (form.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.startDate) < today) errs.startDate = "Start date cannot be in the past";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
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

  function removePhoto() {
    setForm((prev) => ({ ...prev, photo: "" }));
    setPhotoPreview("");
  }

  return (
    <div className="page">
      <h1>Create Event</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
          {errors.title && <span className="field-error">{errors.title}</span>}
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
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Capacity *</label>
            <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" required />
            {errors.capacity && <span className="field-error">{errors.capacity}</span>}
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
            {errors.startDate && <span className="field-error">{errors.startDate}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>End Date *</label>
          <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required min={form.startDate || ""} />
          {errors.endDate && <span className="field-error">{errors.endDate}</span>}
        </div>

        <div className="form-group">
          <label>Event Photo</label>
          <div className="photo-upload-area">
            {photoPreview ? (
              <div className="photo-preview">
                <img src={photoPreview} alt="Preview" />
                <button type="button" className="photo-remove" onClick={removePhoto}>×</button>
              </div>
            ) : (
              <label className="photo-upload-btn">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="11" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 22L10 16L16 20L22 14L30 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Click to upload from gallery</span>
                <span className="photo-upload-hint">JPG, PNG, WebP up to 5MB</span>
                <input type="file" accept="image/*" onChange={handlePhoto} hidden />
              </label>
            )}
          </div>
          {errors.photo && <span className="field-error">{errors.photo}</span>}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
