const db = require("../database");
const { getEventAttendeeCount, parseTicketTiers, validateEventDates, decorateEvent } = require("../utils/events");

// ── Events (public) ──

function listEvents(req, res) {
  const events = db.prepare("SELECT * FROM events WHERE status = 'Approved' ORDER BY startDate ASC").all();
  res.json(events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  })));
}

function getEvent(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  // event.organizerId is now a users.id directly, so the organizer's name
  // comes straight from "users" — no need to go through "organizers" at all.
  const organizer = db.prepare("SELECT fullname FROM users WHERE id = ?").get(event.organizerId);
  const ticketsSold = getEventAttendeeCount(event.id);

  const tierSales = {};
  for (const row of db.prepare(
    "SELECT tier, COALESCE(SUM(quantity), 0) AS s FROM booked_tickets WHERE eventId = ? GROUP BY tier"
  ).all(event.id)) {
    tierSales[row.tier] = row.s;
  }

  res.json(decorateEvent({
    ...event,
    organizerName: organizer ? organizer.fullname : "Unknown",
    ticketsSold,
    tierSales,
  }));
}

// ── Events (organizer) ──
// The queries themselves don't need to change: event.organizerId already
// matches req.user.id, because that id now comes from the same users table
// on both sides.

function getMyEvents(req, res) {
  const events = db.prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate DESC").all(req.user.id);
  const result = events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  }));
  res.json(result);
}

function createEvent(req, res) {
  const { title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccounts, ticketTiers } = req.body;

  if (!title || !location || !capacity || !startDate || !endDate) {
    return res.status(400).json({ error: "title, location, capacity, startDate and endDate are required." });
  }

  const dateError = validateEventDates(startDate, endDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  const accounts = Array.isArray(paymentAccounts)
    ? paymentAccounts
        .filter((a) => a && a.method && a.number)
        .map((a) => ({ method: a.method, number: String(a.number).trim() }))
    : [];
  const firstAccount = accounts.length > 0 ? accounts[0].number : "";

  const tiers = Array.isArray(ticketTiers)
    ? ticketTiers
        .filter((t) => t && t.name && String(t.name).trim() && Number(t.capacity) > 0)
        .map((t) => ({ name: String(t.name).trim(), price: Number(t.price) || 0, capacity: Number(t.capacity) }))
    : [];

  if (tiers.length > 0) {
    const tierTotal = tiers.reduce((sum, t) => sum + Number(t.capacity), 0);
    if (tierTotal > Number(capacity)) {
      return res.status(400).json({ error: `Ticket sections add up to ${tierTotal}, which exceeds the event capacity of ${capacity}.` });
    }
  }

  const result = db.prepare(
    "INSERT INTO events (title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccount, paymentAccounts, ticketTiers, organizerId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')"
  ).run(title, description || "", category || "General", location, price || 0, capacity, startDate, endDate, photo || "", firstAccount, JSON.stringify(accounts), JSON.stringify(tiers), req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, title, status: "Pending" });
}

function updateEvent(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const { title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccounts, ticketTiers } = req.body;

  if (!title || !location || !capacity || !startDate || !endDate) {
    return res.status(400).json({ error: "title, location, capacity, startDate and endDate are required." });
  }

  const dateError = validateEventDates(startDate, endDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  const accounts = Array.isArray(paymentAccounts)
    ? paymentAccounts
        .filter((a) => a && a.method && a.number)
        .map((a) => ({ method: a.method, number: String(a.number).trim() }))
    : [];
  const firstAccount = accounts.length > 0 ? accounts[0].number : "";

  const tiers = Array.isArray(ticketTiers)
    ? ticketTiers
        .filter((t) => t && t.name && String(t.name).trim() && Number(t.capacity) > 0)
        .map((t) => ({ name: String(t.name).trim(), price: Number(t.price) || 0, capacity: Number(t.capacity) }))
    : [];

  if (tiers.length > 0) {
    const tierTotal = tiers.reduce((sum, t) => sum + Number(t.capacity), 0);
    if (tierTotal > Number(capacity)) {
      return res.status(400).json({ error: `Ticket sections add up to ${tierTotal}, which exceeds the event capacity of ${capacity}.` });
    }
  }

  // Never let an organizer shrink capacity below what's already sold.
  const ticketsSold = getEventAttendeeCount(event.id);
  if (tiers.length > 0) {
    const tierSold = {};
    for (const row of db.prepare(
      "SELECT tier, COALESCE(SUM(quantity), 0) AS s FROM booked_tickets WHERE eventId = ? GROUP BY tier"
    ).all(event.id)) {
      tierSold[row.tier] = row.s;
    }
    for (const t of tiers) {
      const sold = tierSold[t.name] || 0;
      if (Number(t.capacity) < sold) {
        return res.status(400).json({ error: `${t.name} capacity cannot be below the ${sold} already-sold seat(s).` });
      }
    }
  } else if (Number(capacity) < ticketsSold) {
    return res.status(400).json({ error: `Capacity cannot be below the ${ticketsSold} already-sold ticket(s).` });
  }

  db.prepare(
    "UPDATE events SET title = ?, description = ?, category = ?, location = ?, price = ?, capacity = ?, startDate = ?, endDate = ?, photo = ?, paymentAccount = ?, paymentAccounts = ?, ticketTiers = ?, status = 'Pending' WHERE id = ?"
  ).run(title, description || "", category || "General", location, price || 0, capacity, startDate, endDate, photo || "", firstAccount, JSON.stringify(accounts), JSON.stringify(tiers), event.id);

  res.json({ id: event.id, title, message: "Event updated. It needs to be approved again before it goes live." });
}

function deleteEvent(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }
  db.prepare("DELETE FROM booked_tickets WHERE eventId = ?").run(event.id);
  db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  res.json({ message: "Event deleted." });
}

module.exports = { listEvents, getEvent, getMyEvents, createEvent, updateEvent, deleteEvent };
