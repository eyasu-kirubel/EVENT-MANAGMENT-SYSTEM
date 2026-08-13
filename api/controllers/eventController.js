const db = require("../database");
const { runInTransaction } = require("../utils/transaction");
const {
  getEventAttendeeCount,
  parseTicketTiers,
  validateEventDates,
  decorateEvent,
  getEventTickets,
  ticketsToJson,
  normalizeTicketType,
  isValidTicketType,
} = require("../utils/events");

// Normalize the ticket-TYPE definitions sent by the client. The new shape is
// tickets: [{ ticketType, price, quantity, description }]; the legacy shape
// ticketTiers: [{ name, price, capacity }] is still accepted so old clients
// keep working. Returns { defs } on success or { error } on failure.
function parseTicketDefs(body) {
  const raw = Array.isArray(body.tickets)
    ? body.tickets
    : Array.isArray(body.ticketTiers)
      ? body.ticketTiers
      : [];
  const seen = new Set();
  const defs = [];
  for (const t of raw) {
    if (!t) continue;
    const type = normalizeTicketType(t.ticketType != null ? t.ticketType : t.name);
    if (!type) continue;
    if (!isValidTicketType(type)) {
      return { error: `Invalid ticket type "${type}". Allowed: Normal, VIP, VVIP (plus legacy General).` };
    }
    if (seen.has(type)) {
      return { error: `Duplicate ticket type "${type}" for this event.` };
    }
    const price = Number(t.price);
    const quantity = Number(t.quantity != null ? t.quantity : t.capacity);
    if (isNaN(price) || price < 0) {
      return { error: `${type} price must be 0 or more.` };
    }
    if (isNaN(quantity) || quantity < 0) {
      return { error: `${type} quantity must be 0 or more.` };
    }
    seen.add(type);
    defs.push({
      ticketType: type,
      price,
      quantity,
      description: t.description && String(t.description).trim() !== "" ? String(t.description).trim() : null,
    });
  }
  return { defs };
}

function syncEventTicketTiers(eventId) {
  const rows = getEventTickets(eventId);
  db.prepare("UPDATE events SET ticketTiers = ? WHERE id = ?").run(JSON.stringify(ticketsToJson(rows)), eventId);
}

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
  const { title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccounts } = req.body;

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

  const { defs, error } = parseTicketDefs(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  if (defs.length > 0) {
    const defsTotal = defs.reduce((sum, t) => sum + Number(t.quantity), 0);
    if (defsTotal > Number(capacity)) {
      return res.status(400).json({ error: `Ticket quantities add up to ${defsTotal}, which exceeds the event capacity of ${capacity}.` });
    }
  }

  let eventId;
  try {
    eventId = runInTransaction(() => {
      const result = db.prepare(
        "INSERT INTO events (title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccount, paymentAccounts, ticketTiers, organizerId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')"
      ).run(title, description || "", category || "General", location, price || 0, capacity, startDate, endDate, photo || "", firstAccount, JSON.stringify(accounts), JSON.stringify(ticketsToJson(defs)), req.user.id);
      const id = Number(result.lastInsertRowid);
      for (const d of defs) {
        db.prepare(
          "INSERT INTO tickets (eventId, ticketType, price, quantity, description) VALUES (?, ?, ?, ?, ?)"
        ).run(id, d.ticketType, d.price, d.quantity, d.description);
      }
      return id;
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.status(201).json({ id: eventId, title, status: "Pending" });
}

function updateEvent(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const { title, description, category, location, price, capacity, startDate, endDate, photo, paymentAccounts } = req.body;

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

  const { defs, error } = parseTicketDefs(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  if (defs.length > 0) {
    const defsTotal = defs.reduce((sum, t) => sum + Number(t.quantity), 0);
    if (defsTotal > Number(capacity)) {
      return res.status(400).json({ error: `Ticket quantities add up to ${defsTotal}, which exceeds the event capacity of ${capacity}.` });
    }
  }

  // Never let an organizer shrink a ticket type below what's already sold,
  // and never remove a ticket type that has sales.
  const existing = getEventTickets(event.id);
  for (const t of existing) {
    const nd = defs.find((d) => d.ticketType === t.ticketType);
    if (!nd) {
      if (Number(t.soldQuantity) > 0) {
        return res.status(400).json({ error: `${t.ticketType} has ${t.soldQuantity} sold ticket(s) and cannot be removed.` });
      }
    } else if (Number(nd.quantity) < Number(t.soldQuantity)) {
      return res.status(400).json({ error: `${t.ticketType} quantity cannot be below the ${t.soldQuantity} already-sold ticket(s).` });
    }
  }

  // Flat-price safety net when the event has no ticket rows at all.
  const ticketsSold = getEventAttendeeCount(event.id);
  if (defs.length === 0 && Number(capacity) < ticketsSold) {
    return res.status(400).json({ error: `Capacity cannot be below the ${ticketsSold} already-sold ticket(s).` });
  }

  try {
    runInTransaction(() => {
      db.prepare(
        "UPDATE events SET title = ?, description = ?, category = ?, location = ?, price = ?, capacity = ?, startDate = ?, endDate = ?, photo = ?, paymentAccount = ?, paymentAccounts = ?, ticketTiers = ?, status = 'Pending' WHERE id = ?"
      ).run(title, description || "", category || "General", location, price || 0, capacity, startDate, endDate, photo || "", firstAccount, JSON.stringify(accounts), JSON.stringify(ticketsToJson(defs)), event.id);

      for (const d of defs) {
        const cur = existing.find((t) => t.ticketType === d.ticketType);
        if (cur) {
          db.prepare(
            "UPDATE tickets SET price = ?, quantity = ?, description = ?, updatedAt = datetime('now') WHERE id = ?"
          ).run(d.price, d.quantity, d.description, cur.id);
        } else {
          db.prepare(
            "INSERT INTO tickets (eventId, ticketType, price, quantity, description) VALUES (?, ?, ?, ?, ?)"
          ).run(event.id, d.ticketType, d.price, d.quantity, d.description);
        }
      }
      for (const t of existing) {
        if (!defs.some((d) => d.ticketType === t.ticketType)) {
          db.prepare("DELETE FROM tickets WHERE id = ?").run(t.id);
        }
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.json({ id: event.id, title, message: "Event updated. It needs to be approved again before it goes live." });
}

function deleteEvent(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }
  runInTransaction(() => {
    db.prepare("DELETE FROM booked_tickets WHERE eventId = ?").run(event.id);
    db.prepare("DELETE FROM tickets WHERE eventId = ?").run(event.id);
    db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  });
  res.json({ message: "Event deleted." });
}

// ── Ticket TYPE management (organizer's own events only) ──

function listEventTickets(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }
  res.json(getEventTickets(event.id));
}

function addEventTicket(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const type = normalizeTicketType(req.body.ticketType);
  if (!type || !isValidTicketType(type)) {
    return res.status(400).json({ error: `Invalid ticket type "${req.body.ticketType}". Allowed: Normal, VIP, VVIP.` });
  }
  const price = Number(req.body.price);
  const quantity = Number(req.body.quantity);
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: "price must be 0 or more." });
  }
  if (isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ error: "quantity must be 0 or more." });
  }

  const dup = db.prepare("SELECT id FROM tickets WHERE eventId = ? AND ticketType = ?").get(event.id, type);
  if (dup) {
    return res.status(409).json({ error: `This event already has a ${type} ticket type.` });
  }

  const existingTotal = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS c FROM tickets WHERE eventId = ?").get(event.id).c;
  if (existingTotal + quantity > Number(event.capacity)) {
    return res.status(400).json({ error: "Adding this ticket type would exceed the event capacity." });
  }

  const description = req.body.description && String(req.body.description).trim() !== "" ? String(req.body.description).trim() : null;
  const ins = db.prepare(
    "INSERT INTO tickets (eventId, ticketType, price, quantity, description) VALUES (?, ?, ?, ?, ?)"
  ).run(event.id, type, price, quantity, description);
  syncEventTicketTiers(event.id);

  res.status(201).json(db.prepare("SELECT * FROM tickets WHERE id = ?").get(ins.lastInsertRowid));
}

function updateEventTicket(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND eventId = ?").get(req.params.ticketId, event.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket type not found." });
  }

  const price = req.body.price !== undefined ? Number(req.body.price) : Number(ticket.price);
  const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : Number(ticket.quantity);
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: "price must be 0 or more." });
  }
  if (isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ error: "quantity must be 0 or more." });
  }
  if (quantity < Number(ticket.soldQuantity)) {
    return res.status(400).json({ error: `Cannot reduce ${ticket.ticketType} below the ${ticket.soldQuantity} already-sold ticket(s).` });
  }

  const otherTotal = db.prepare(
    "SELECT COALESCE(SUM(quantity), 0) AS c FROM tickets WHERE eventId = ? AND id != ?"
  ).get(event.id, ticket.id).c;
  if (otherTotal + quantity > Number(event.capacity)) {
    return res.status(400).json({ error: "This change would exceed the event capacity." });
  }

  const description = req.body.description !== undefined
    ? (String(req.body.description).trim() !== "" ? String(req.body.description).trim() : null)
    : ticket.description;
  db.prepare(
    "UPDATE tickets SET price = ?, quantity = ?, description = ?, updatedAt = datetime('now') WHERE id = ?"
  ).run(price, quantity, description, ticket.id);
  syncEventTicketTiers(event.id);

  res.json(db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket.id));
}

function deleteEventTicket(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND eventId = ?").get(req.params.ticketId, event.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket type not found." });
  }
  if (Number(ticket.soldQuantity) > 0) {
    return res.status(400).json({ error: `Cannot remove ${ticket.ticketType}: ${ticket.soldQuantity} ticket(s) already sold.` });
  }

  db.prepare("DELETE FROM tickets WHERE id = ?").run(ticket.id);
  syncEventTicketTiers(event.id);

  res.json({ message: "Ticket type deleted." });
}

module.exports = {
  listEvents,
  getEvent,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listEventTickets,
  addEventTicket,
  updateEventTicket,
  deleteEventTicket,
};
