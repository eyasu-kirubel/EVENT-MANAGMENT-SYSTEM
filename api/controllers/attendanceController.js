const db = require("../database");

// ── Attendance ──
// Queries are unchanged — event.organizerId already equals req.user.id (a
// users.id), and the routes require organizer authorization before reaching
// these handlers.

function getEventAttendance(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.eventId, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const attendees = db.prepare(
    `SELECT bt.id, bt.quantity, bt.scanned, bt.scannedAt,
            u.fullname, u.phonenumber
     FROM booked_tickets bt
     JOIN users u ON u.id = bt.userId
     WHERE bt.eventId = ?
     ORDER BY bt.bookingDate ASC`
  ).all(req.params.eventId);

  res.json({ attendees });
}

function getStats(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.eventId);
  if (!event) return res.status(404).json({ error: "Event not found." });

  const totals = db.prepare(
    "SELECT COALESCE(SUM(quantity), 0) AS totalBooked, COALESCE(SUM(CASE WHEN scanned=1 THEN quantity ELSE 0 END), 0) AS totalScanned FROM booked_tickets WHERE eventId = ?"
  ).get(req.params.eventId);

  res.json({
    capacity: event.capacity,
    totalBooked: totals.totalBooked,
    totalScanned: totals.totalScanned,
    remaining: event.capacity - totals.totalBooked,
  });
}

function scan(req, res) {
  const { qrData } = req.body;
  if (!qrData) {
    return res.status(400).json({ error: "qrData is required." });
  }

  let parsed;
  try {
    parsed = JSON.parse(qrData);
  } catch {
    return res.status(400).json({ error: "Invalid QR code data." });
  }

  const ticket = db.prepare("SELECT * FROM booked_tickets WHERE id = ?").get(parsed.ticketId);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(ticket.eventId, req.user.id);
  if (!event) {
    return res.status(403).json({ error: "This ticket is for a different event." });
  }

  if (ticket.scanned) {
    return res.json({
      status: "duplicate",
      scannedAt: ticket.scannedAt,
      ticketId: ticket.id,
      quantity: ticket.quantity,
      userId: ticket.userId,
      event: { id: event.id, title: event.title, location: event.location, startDate: event.startDate, endDate: event.endDate },
    });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE booked_tickets SET scanned = 1, scannedAt = ? WHERE id = ?").run(now, ticket.id);

  res.json({
    status: "success",
    scannedAt: now,
    ticketId: ticket.id,
    quantity: ticket.quantity,
    userId: ticket.userId,
    event: { id: event.id, title: event.title, location: event.location, startDate: event.startDate, endDate: event.endDate },
  });
}

module.exports = { getEventAttendance, getStats, scan };
