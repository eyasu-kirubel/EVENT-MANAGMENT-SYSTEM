import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import { EVENT_CATEGORIES } from "../../constants/categories";
import { BsGeoAlt, BsGlobe2, BsLock, BsUnlock } from "react-icons/bs";

const DRAFT_KEY = "eventDraft";
const CATEGORY_KEY = "organizerEventCategories";
const EVENT_META_KEY = "eventFrontendMeta";

function getCustomCategories() {
  try { return JSON.parse(localStorage.getItem(CATEGORY_KEY) || "[]").filter(Boolean); } catch { return []; }
}

function emptyForm() {
  return {
    title: "",
    description: "",
    category: "General",
    eventType: "in-person",
    visibility: "public",
    privateGuests: [],
    onlineUrl: "",
    location: "",
    price: 0,
    capacity: "",
    startDate: "",
    endDate: "",
    photo: "",
    paymentAccounts: [{ method: "telebirr", number: "" }],
    ticketTiers: [{ name: "Normal", price: 0, quantity: "", description: "" }],
  };
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveEventMeta(id, form) {
  try {
    const all = JSON.parse(localStorage.getItem(EVENT_META_KEY) || "{}");
    all[String(id)] = {
      eventType: form.eventType,
      visibility: form.visibility,
      privateGuests: Array.isArray(form.privateGuests) ? form.privateGuests : [],
      onlineUrl: form.onlineUrl,
    };
    localStorage.setItem(EVENT_META_KEY, JSON.stringify(all));
  } catch {}
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("edit");
  const isEditing = !!editingId;
  const [form, setForm] = useState(() => {
    const draft = readDraft();
    return draft ? { ...emptyForm(), ...draft.form } : emptyForm();
  });
  const [draftRestored, setDraftRestored] = useState(() => !!readDraft());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!!editingId);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const events = await api.get("/events/organizer/my-events");
        const ev = events.find((e) => String(e.id) === editingId);
        if (!ev) {
          if (!cancelled) setError("Event not found.");
          return;
        }
        if (cancelled) return;
        let meta = {};
        try { meta = JSON.parse(localStorage.getItem(EVENT_META_KEY) || "{}")[editingId] || {}; } catch {}
        const fromTickets = Array.isArray(ev.tickets) && ev.tickets.length > 0
          ? ev.tickets.map((t) => ({ name: t.ticketType, price: t.price, quantity: t.quantity, description: t.description || "" }))
          : null;
        setForm({
          title: ev.title || "",
          description: ev.description || "",
          category: ev.category || "General",
          eventType: meta.eventType || "in-person",
          visibility: ev.visibility || meta.visibility || "public",
          privateGuests: Array.isArray(meta.privateGuests) ? meta.privateGuests : [],
          onlineUrl: meta.onlineUrl || "",
          location: ev.location || "",
          price: ev.price || 0,
          capacity: ev.capacity || "",
          startDate: ev.startDate || "",
          endDate: ev.endDate || "",
          photo: ev.photo || "",
          paymentAccounts:
            Array.isArray(ev.paymentAccounts) && ev.paymentAccounts.length > 0
              ? ev.paymentAccounts
              : [{ method: "telebirr", number: "" }],
          ticketTiers:
            fromTickets
              ? fromTickets
              : Array.isArray(ev.ticketTiers) && ev.ticketTiers.length > 0
                ? ev.ticketTiers.map((t) => ({ name: t.name, price: t.price, quantity: t.capacity, description: t.description || "" }))
                : [{ name: "Normal", price: ev.price || 0, quantity: ev.capacity || "", description: "" }],
        });
        setPhotoPreview(ev.photo || "");
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editingId]);

  useEffect(() => {
    const total = form.ticketTiers.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    const current = form.capacity === "" || form.capacity == null ? 0 : parseInt(form.capacity) || 0;
    if (total !== current) {
      setForm((prev) => ({ ...prev, capacity: total || "" }));
    }
  }, [form.ticketTiers]);

  useEffect(() => {
    if (isEditing) return;
    const hasContent =
      form.title.trim() ||
      form.description.trim() ||
      form.location.trim() ||
      form.capacity ||
      form.startDate ||
      form.endDate ||
      form.paymentAccounts.some((a) => a.number && a.number.trim()) ||
      form.ticketTiers.some((t) => (t.quantity !== "" && t.quantity != null) || Number(t.price) > 0);
    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: { ...form, photo: "" }, hasPhoto: !!form.photo, savedAt: Date.now() }));
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [form]);

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm());
    setPhotoPreview("");
    setDraftRestored(false);
  }

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

  function handleAccountChange(index, field, value) {
    setForm((prev) => ({
      ...prev,
      paymentAccounts: prev.paymentAccounts.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
    if (errors.paymentAccounts) setErrors((prev) => ({ ...prev, paymentAccounts: "" }));
  }

  function addAccount() {
    setForm((prev) => ({
      ...prev,
      paymentAccounts: [...prev.paymentAccounts, { method: "telebirr", number: "" }],
    }));
    if (errors.paymentAccounts) setErrors((prev) => ({ ...prev, paymentAccounts: "" }));
  }

  function removeAccount(index) {
    setForm((prev) => ({
      ...prev,
      paymentAccounts: prev.paymentAccounts.filter((_, i) => i !== index),
    }));
  }

  function handleTierChange(index, field, value) {
    setForm((prev) => ({
      ...prev,
      ticketTiers: prev.ticketTiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
    if (errors.ticketTiers) setErrors((prev) => ({ ...prev, ticketTiers: "" }));
  }

  function addTier() {
    setForm((prev) => ({
      ...prev,
      ticketTiers: [...prev.ticketTiers, { name: "VIP", price: 0, quantity: "", description: "" }],
    }));
    if (errors.ticketTiers) setErrors((prev) => ({ ...prev, ticketTiers: "" }));
  }

  function removeTier(index) {
    setForm((prev) => ({
      ...prev,
      ticketTiers: prev.ticketTiers.filter((_, i) => i !== index),
    }));
  }

  function addPrivateGuest() {
    setForm((prev) => ({
      ...prev,
      privateGuests: [...(prev.privateGuests || []), { fullname: "", phonenumber: "" }],
    }));
  }

  function updatePrivateGuest(index, field, value) {
    setForm((prev) => ({
      ...prev,
      privateGuests: (prev.privateGuests || []).map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    }));
    if (errors.privateGuests) {
      setErrors((prev) => ({ ...prev, privateGuests: "" }));
    }
  }

  function removePrivateGuest(index) {
    setForm((prev) => ({
      ...prev,
      privateGuests: (prev.privateGuests || []).filter((_, i) => i !== index),
    }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (form.eventType === "in-person" && !form.location.trim()) errs.location = "Location is required";
    if (form.eventType === "online" && !form.onlineUrl.trim()) errs.onlineUrl = "Online event link is required";
    if (!form.capacity || parseInt(form.capacity) < 1) errs.capacity = "Capacity must be at least 1";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.endDate) errs.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = "End date must be after start date";
    }

    if (form.visibility === "private") {
      const guests = (form.privateGuests || [])
        .filter((g) => g.phonenumber && String(g.phonenumber).trim());
      if (guests.length === 0) {
        errs.privateGuests = "Add at least one guest's phone number for a private event";
      } else {
        const phones = guests.map((g) => String(g.phonenumber).trim());
        if (new Set(phones).size !== phones.length) {
          errs.privateGuests = "Each guest must have a unique phone number";
        }
        for (const phone of phones) {
          const digits = phone.replace(/\D/g, "");
          if (digits.length !== 10) {
            errs.privateGuests = "Each phone number must be 10 digits (09XXXXXXXX)";
            break;
          }
        }
      }
    }

    const filledAccounts = form.paymentAccounts.filter((a) => a.number && a.number.trim());
    if (filledAccounts.length === 0) {
      errs.paymentAccounts = "Add at least one payment account";
    } else {
      for (const acc of filledAccounts) {
        const digits = acc.number.replace(/\D/g, "");
        if (acc.method === "cbe" && digits.length !== 13) {
          errs.paymentAccounts = "CBE account must be 13 digits";
          break;
        }
        if (acc.method !== "cbe" && digits.length !== 10) {
          errs.paymentAccounts = "Phone number must be 10 digits (09XXXXXXXX)";
          break;
        }
      }
    }
    if (form.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.startDate) < today) errs.startDate = "Start date cannot be in the past";
    }

    const filledTiers = form.ticketTiers.filter((t) => t.name && t.name.trim());
    for (const tier of filledTiers) {
      if (!tier.quantity || parseInt(tier.quantity) < 1) {
        errs.ticketTiers = `${tier.name} needs a quantity of at least 1`;
        break;
      }
      if (parseFloat(tier.price) < 0) {
        errs.ticketTiers = `${tier.name} price cannot be negative`;
        break;
      }
    }

    if (filledTiers.length > 0 && form.capacity) {
      const tierTotal = filledTiers.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
      const eventCap = parseInt(form.capacity);
      if (eventCap && tierTotal > eventCap) {
        errs.ticketTiers = `Ticket quantities add up to ${tierTotal}, but the event capacity is ${eventCap}.`;
      }
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
      const tickets = form.ticketTiers
        .filter((t) => t.name && t.name.trim() && parseInt(t.quantity) >= 1)
        .map((t) => ({
          ticketType: t.name.trim(),
          price: parseFloat(t.price) || 0,
          quantity: parseInt(t.quantity),
          description: (t.description || "").trim(),
        }));
      const minPrice = tickets.length > 0 ? Math.min(...tickets.map((t) => t.price)) : parseFloat(form.price) || 0;
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.eventType === "online" ? (form.location.trim() || "Online Event") : form.location.trim(),
        price: minPrice,
        capacity: parseInt(form.capacity),
        startDate: form.startDate,
        endDate: form.endDate,
        photo: form.photo,
        paymentAccounts: form.paymentAccounts.filter((a) => a.number && a.number.trim()),
        tickets,
        ticketTiers: tickets.map((t) => ({ name: t.ticketType, price: t.price, capacity: t.quantity })),
        visibility: form.visibility,
        guests: form.visibility === "private"
          ? (form.privateGuests || []).filter((g) => g.phonenumber && String(g.phonenumber).trim()).map((g) => ({
              fullname: (g.fullname || "").trim(),
              phonenumber: String(g.phonenumber).trim(),
            }))
          : [],
      };
      if (isEditing) {
        await api.put(`/events/${editingId}`, payload);
        saveEventMeta(editingId, form);
        navigate("/organizer/events");
      } else {
        const created = await api.post("/events", payload);
        if (created?.id) saveEventMeta(created.id, form);
        localStorage.removeItem(DRAFT_KEY);
        navigate("/organizer");
      }
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
      <button type="button" className="admin-back" style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => navigate('/organizer')}>
        ← Back to Dashboard
      </button>
      <h1>{isEditing ? "Edit Event" : "Create Event"}</h1>

      {loadingEvent ? (
        <div className="loading">Loading event...</div>
      ) : (
      <>
      {!isEditing && draftRestored && (
        <div className="draft-banner">
          <span className="draft-banner-text">Draft restored — your unsaved event is here.</span>
          <button type="button" className="draft-discard-btn" onClick={discardDraft}>Discard draft</button>
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        {isEditing && (
          <div className="draft-banner">
            <span className="draft-banner-text">Changes will send this event back for admin approval before it is live again.</span>
          </div>
        )}

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
              {[...new Set([...EVENT_CATEGORIES, ...getCustomCategories()])].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="event-options-grid">
          <div className="form-group">
            <label>Event type</label>
            <div className="choice-grid">
              <label className={`choice-card ${form.eventType === "in-person" ? "selected" : ""}`}>
                <input type="radio" name="eventType" value="in-person" checked={form.eventType === "in-person"} onChange={handleChange} />
                <span><BsGeoAlt /> In-person</span>
              </label>
              <label className={`choice-card ${form.eventType === "online" ? "selected" : ""}`}>
                <input type="radio" name="eventType" value="online" checked={form.eventType === "online"} onChange={handleChange} />
                <span><BsGlobe2 /> Online</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Visibility</label>
            <div className="choice-grid">
              <label className={`choice-card ${form.visibility === "public" ? "selected" : ""}`}>
                <input type="radio" name="visibility" value="public" checked={form.visibility === "public"} onChange={handleChange} />
                <span><BsUnlock /> Public</span>
              </label>
              <label className={`choice-card ${form.visibility === "private" ? "selected" : ""}`}>
                <input type="radio" name="visibility" value="private" checked={form.visibility === "private"} onChange={handleChange} />
                <span><BsLock /> Private</span>
              </label>
            </div>
          </div>
        </div>

        {form.eventType === "online" && (
          <div className="form-group">
            <label>Online event link *</label>
            <input type="url" name="onlineUrl" value={form.onlineUrl} onChange={handleChange} placeholder="https://..." />
            {errors.onlineUrl && <span className="field-error">{errors.onlineUrl}</span>}
          </div>
        )}

        {form.visibility === "private" && (
          <div className="private-guest-section">
            <div className="private-guest-header">
              <div>
                <label>Private guest list *</label>
                <p className="form-hint">Add phone numbers (and optionally names) of people invited to this private event. Registered users will receive tickets automatically.</p>
              </div>
              <span className="private-guest-badge"><BsLock /> Private</span>
            </div>

            <div className="private-guest-list">
              {(form.privateGuests || []).map((guest, index) => (
                <div className="private-guest-row" key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="private-guest-number">{index + 1}</span>
                  <input
                    type="text"
                    value={guest.phonenumber || ""}
                    onChange={(e) => updatePrivateGuest(index, "phonenumber", e.target.value)}
                    placeholder="Phone number (required)"
                    maxLength={20}
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label={`Private guest ${index + 1} phone number`}
                  />
                  <input
                    type="text"
                    value={guest.fullname || ""}
                    onChange={(e) => updatePrivateGuest(index, "fullname", e.target.value)}
                    placeholder="Full name (optional)"
                    maxLength={100}
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label={`Private guest ${index + 1} full name`}
                  />
                  <button
                    type="button"
                    className="pay-account-remove"
                    onClick={() => removePrivateGuest(index)}
                    aria-label={`Remove private guest ${index + 1}`}
                    title="Remove guest"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-ghost btn-sm" onClick={addPrivateGuest}>
              + Add invited person
            </button>

            {errors.privateGuests && (
              <span className="field-error">{errors.privateGuests}</span>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Ticket Types</label>
          <p className="form-hint">Set the price and quantity for each ticket type. The total capacity is calculated automatically from the quantities.</p>
          {form.ticketTiers.map((tier, index) => (
            <div className="tier-card" key={index}>
              <div className="tier-row">
                <select
                  value={tier.name}
                  onChange={(e) => handleTierChange(index, "name", e.target.value)}
                  aria-label={`Ticket type ${index + 1} name`}
                >
                  <option value="Normal">Normal</option>
                  <option value="VIP">VIP</option>
                  <option value="VVIP">VVIP</option>
                  <option value="General">General</option>
                </select>
                <input
                  type="number"
                  placeholder="Price (ETB)"
                  min="0"
                  step="0.01"
                  value={tier.price}
                  onChange={(e) => handleTierChange(index, "price", e.target.value)}
                  aria-label={`Ticket type ${index + 1} price`}
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  min="1"
                  value={tier.quantity}
                  onChange={(e) => handleTierChange(index, "quantity", e.target.value)}
                  aria-label={`Ticket type ${index + 1} quantity`}
                />
                {form.ticketTiers.length > 1 && (
                  <button
                    type="button"
                    className="pay-account-remove"
                    onClick={() => removeTier(index)}
                    aria-label={`Remove ticket type ${index + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                type="text"
                className="tier-desc-input"
                placeholder="Description (optional) — e.g. Standard entry, VIP access"
                value={tier.description || ""}
                onChange={(e) => handleTierChange(index, "description", e.target.value)}
                aria-label={`Ticket type ${index + 1} description`}
              />
            </div>
          ))}
          {form.ticketTiers.length < 3 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={addTier}>
              + Add a ticket type
            </button>
          )}
          {errors.ticketTiers && <span className="field-error">{errors.ticketTiers}</span>}
        </div>

        <div className="form-group">
          <label>Location *</label>
          <input type="text" name="location" value={form.location} onChange={handleChange} required />
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div>

        <div className="form-group">
          <label>Payment Accounts *</label>
          <p className="form-hint">The accounts customers will pay to. You can add up to 3 (Telebirr, M-PESA, CBE).</p>
          {form.paymentAccounts.map((acc, index) => (
            <div className="pay-account-row" key={index}>
              <select
                value={acc.method}
                onChange={(e) => handleAccountChange(index, "method", e.target.value)}
                aria-label={`Payment account ${index + 1} method`}
              >
                <option value="telebirr">Telebirr</option>
                <option value="mpesa">M-PESA</option>
                <option value="cbe">CBE Bank</option>
              </select>
              <input
                type="text"
                placeholder={acc.method === "cbe" ? "CBE account (13 digits)" : "Phone number (09XXXXXXXX)"}
                value={acc.number}
                onChange={(e) => handleAccountChange(index, "number", e.target.value)}
              />
              {form.paymentAccounts.length > 1 && (
                <button
                  type="button"
                  className="pay-account-remove"
                  onClick={() => removeAccount(index)}
                  aria-label={`Remove payment account ${index + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {form.paymentAccounts.length < 3 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={addAccount}>
              + Add another account
            </button>
          )}
          {errors.paymentAccounts && <span className="field-error">{errors.paymentAccounts}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Total Capacity</label>
            <input type="number" value={form.capacity || 0} readOnly disabled />
            <p className="form-hint">Auto-calculated from the ticket type quantities above.</p>
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
          {isEditing ? (loading ? "Saving..." : "Save Changes") : (loading ? "Creating..." : "Create Event")}
        </button>
      </form>
      </>
      )}
    </div>
  );
}
