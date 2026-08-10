const crypto = require("node:crypto");
const QRCode = require("qrcode");
const db = require("../database");
const { getEventAttendeeCount, parseTicketTiers } = require("../utils/events");

// ── Tickets ──
// requireRole("user") already covers organizers too, because organizers now
// carry role = "user" — organizers automatically get everything a normal
// user can do.

function book(req, res) {
  const { eventId, quantity, paymentMethod, paidTo, tier } = req.body;
  const qty = Number(quantity) || 1;
  const tierName = (tier && String(tier).trim()) || "General";

  const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

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
    ).get(eventId, tierName).total;
    if (qty > Number(tierDef.capacity) - tierSold) {
      return res.status(400).json({ error: `Only ${Number(tierDef.capacity) - tierSold} ${tierName} seat(s) left.` });
    }
  } else {
    const ticketsSold = getEventAttendeeCount(eventId);
    if (qty > event.capacity - ticketsSold) {
      return res.status(400).json({ error: `Only ${event.capacity - ticketsSold} seat(s) left.` });
    }
  }

  const qrCode = crypto.randomUUID();
  const bookingDate = new Date().toISOString();

  const result = db.prepare(
    "INSERT INTO booked_tickets (userId, eventId, quantity, qrCode, bookingDate, paymentMethod, paidTo, tier, unitPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(req.user.id, eventId, qty, qrCode, bookingDate, paymentMethod || null, paidTo || null, tierName, unitPrice);

  res.status(201).json({ message: "Ticket booked successfully.", bookingId: result.lastInsertRowid, unitPrice });
}

function getMyTickets(req, res) {
  const tickets = db.prepare(
    `SELECT bt.id, bt.quantity, bt.bookingDate, bt.scanned, bt.scannedAt, bt.tier, bt.unitPrice,
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

  const qrPayload = JSON.stringify({
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
  });

  QRCode.toString(qrPayload, { type: "svg", width: 300, margin: 2 }, (err, svg) => {
    if (err) return res.status(500).json({ error: "Failed to generate QR code." });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });
}

// ── Delete Booking ──
function cancel(req, res) {
  const ticket = db.prepare("SELECT * FROM booked_tickets WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }
  db.prepare("DELETE FROM booked_tickets WHERE id = ?").run(ticket.id);
  res.json({ message: "Booking cancelled." });
}

module.exports = { book, getMyTickets, getQr, cancel };
