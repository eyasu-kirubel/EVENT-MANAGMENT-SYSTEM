const crypto = require("node:crypto");
const QRCode = require("qrcode");
const db = require("../database");
const { getEventAttendeeCount, parseTicketTiers } = require("../utils/events");
const { runInTransaction } = require("../utils/transaction");

// ── Tickets ──
// requireRole("user") already covers organizers too, because organizers now
// carry role = "user" — organizers automatically get everything a normal
// user can do.

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ── Book ──
// The server is the only source of truth for the price: the caller can send a
// ticketId (a row of the tickets table) or a legacy tier name, but the price
// always comes from the database, never from the request body.
// Bookings are transactional so soldQuantity can never exceed quantity.
function book(req, res) {
  const { eventId, quantity, ticketId, tier, paymentMethod, paidTo } = req.body;
  const qty = Number(quantity) || 1;
  if (qty < 1) {
    return res.status(400).json({ error: "quantity must be at least 1." });
  }

  const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  // Private event: only invited guests or the organizer can book.
  if (event.visibility === 'private') {
    const isOrganizer = req.user.id === event.organizerId;
    const isGuest = !!db.prepare(
      "SELECT 1 FROM private_event_guests WHERE eventId = ? AND userId = ?"
    ).get(event.id, req.user.id);
    if (!isOrganizer && !isGuest) {
      return res.status(404).json({ error: "Event not found." });
    }
  }

  // Resolve the ticket TYPE row. Explicit ticketId is the primary path; a
  // legacy tier name is matched against the tickets table when present so
  // old clients keep working. Events with no tickets rows fall back to the
  // legacy JSON-tier / flat-price path below.
  let ticket = null;
  if (ticketId !== undefined && ticketId !== null) {
    ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (ticket.eventId !== event.id) {
      return res.status(400).json({ error: "Ticket does not belong to this event." });
    }
  } else {
    const tierName = (tier && String(tier).trim()) || "General";
    ticket = db.prepare("SELECT * FROM tickets WHERE eventId = ? AND ticketType = ?").get(event.id, tierName);
  }

  if (ticket) {
    const unitPrice = Number(ticket.price) || 0;
    let bookingId;
    try {
      bookingId = runInTransaction(() => {
        const fresh = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket.id);
        const remaining = Number(fresh.quantity) - Number(fresh.soldQuantity);
        if (qty > remaining) {
          throw httpError(400, `Only ${Math.max(0, remaining)} ${fresh.ticketType} ticket(s) left.`);
        }

        const qrCode = crypto.randomUUID();
        const bookingDate = new Date().toISOString();
        const result = db.prepare(
          "INSERT INTO booked_tickets (userId, eventId, quantity, qrCode, bookingDate, paymentMethod, paidTo, tier, unitPrice, ticketId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(req.user.id, event.id, qty, qrCode, bookingDate, paymentMethod || null, paidTo || null, ticket.ticketType, unitPrice, ticket.id);

        db.prepare(
          "UPDATE tickets SET soldQuantity = soldQuantity + ?, updatedAt = datetime('now') WHERE id = ?"
        ).run(qty, ticket.id);

        return result.lastInsertRowid;
      });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }

    return res.status(201).json({ message: "Ticket booked successfully.", bookingId, unitPrice });
  }

  // ── Legacy path: no tickets rows for this event (pre-migration or flat
  // price events). Availability is derived from the ticketTiers JSON and the
  // booked_tickets rows, exactly as before.
  const tierName = (tier && String(tier).trim()) || "General";
  const tiers = parseTicketTiers(event);
  let unitPrice = Number(event.price) || 0;

  if (tiers.length > 0) {
    const tierDef = tiers.find((t) => t.name === tierName);
    if (!tierDef) {
      return res.status(400).json({ error: "Unknown ticket section." });
    }
    unitPrice = Number(tierDef.price) || 0;
    const tierSold = db.prepare(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM booked_tickets WHERE eventId = ? AND tier = ?"
    ).get(event.id, tierName).total;
    if (qty > Number(tierDef.capacity) - tierSold) {
      return res.status(400).json({ error: `Only ${Number(tierDef.capacity) - tierSold} ${tierName} seat(s) left.` });
    }
  } else {
    const ticketsSold = getEventAttendeeCount(event.id);
    if (qty > event.capacity - ticketsSold) {
      return res.status(400).json({ error: `Only ${event.capacity - ticketsSold} seat(s) left.` });
    }
  }

  const qrCode = crypto.randomUUID();
  const bookingDate = new Date().toISOString();

  const result = db.prepare(
    "INSERT INTO booked_tickets (userId, eventId, quantity, qrCode, bookingDate, paymentMethod, paidTo, tier, unitPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(req.user.id, event.id, qty, qrCode, bookingDate, paymentMethod || null, paidTo || null, tierName, unitPrice);

  res.status(201).json({ message: "Ticket booked successfully.", bookingId: result.lastInsertRowid, unitPrice });
}

function getMyTickets(req, res) {
  const tickets = db.prepare(
    `SELECT bt.id, bt.quantity, bt.bookingDate, bt.scanned, bt.scannedAt, bt.tier, bt.unitPrice, bt.ticketId,
            e.title AS eventTitle, e.location AS eventLocation,
            e.startDate AS eventStartDate, e.endDate AS eventEndDate
     FROM booked_tickets bt
     JOIN events e ON e.id = bt.eventId
     WHERE bt.userId = ?
     ORDER BY bt.bookingDate DESC`
  ).all(req.user.id);

  res.json(tickets);
}

function getQr(req, res) {
  const ticket = db.prepare(
    `SELECT bt.*, e.title AS eventTitle, e.location AS eventLocation,
            e.startDate AS eventStartDate, e.endDate AS eventEndDate
     FROM booked_tickets bt
     JOIN events e ON e.id = bt.eventId
     WHERE bt.id = ? AND bt.userId = ?`
  ).get(req.params.id, req.user.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const user = db.prepare("SELECT fullname, phonenumber FROM users WHERE id = ?").get(ticket.userId);

  // The QR payload identifies the booking by id AND carries the per-booking
  // random token (booked_tickets.qrCode, a crypto UUID) so the scanner can
  // verify authenticity. Pre-existing bookings with no qrCode keep the
  // legacy id-only payload — old printed QRs stay valid.
  const qrPayload = {
    ticketId: ticket.id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    event: ticket.eventTitle,
    attendee: user ? user.fullname : "Unknown",
    phone: user ? user.phonenumber : "",
    date: ticket.eventStartDate,
    qty: ticket.quantity,
    tier: ticket.tier || "General",
    ts: ticket.bookingDate,
  };
  if (ticket.qrCode) {
    qrPayload.qrCode = ticket.qrCode;
  }

  QRCode.toString(JSON.stringify(qrPayload), { type: "svg", width: 300, margin: 2 }, (err, svg) => {
    if (err) return res.status(500).json({ error: "Failed to generate QR code." });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });
}

// ── Delete Booking ──
// Cancelling also gives the ticket TYPE row back its capacity (soldQuantity
// is decremented, never below 0) so the freed seats become bookable again.
function cancel(req, res) {
  const ticket = db.prepare("SELECT * FROM booked_tickets WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  runInTransaction(() => {
    if (ticket.ticketId) {
      db.prepare(
        "UPDATE tickets SET soldQuantity = MAX(0, soldQuantity - ?), updatedAt = datetime('now') WHERE id = ?"
      ).run(ticket.quantity, ticket.ticketId);
    } else {
      // Legacy booking that never got linked: try the tier match.
      const row = db.prepare("SELECT id FROM tickets WHERE eventId = ? AND ticketType = ?").get(ticket.eventId, ticket.tier);
      if (row) {
        db.prepare(
          "UPDATE tickets SET soldQuantity = MAX(0, soldQuantity - ?), updatedAt = datetime('now') WHERE id = ?"
        ).run(ticket.quantity, row.id);
      }
    }
    db.prepare("DELETE FROM booked_tickets WHERE id = ?").run(ticket.id);
  });

  res.json({ message: "Booking cancelled." });
}

module.exports = { book, getMyTickets, getQr, cancel };
