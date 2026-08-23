const db = require("../database");

// ── Attendance ──
// event.organizerId already equals req.user.id (a users.id), and the routes
// require organizer authorization before reaching these handlers. Every
// handler below ALSO re-checks ownership of the specific event server-side:
// requireOrganizer only proves "this user is an organizer", not that they
// own the event being queried or scanned.

function getEventAttendance(req, res) {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.eventId, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const attendees = db.prepare(
    `SELECT bt.id, bt.quantity, bt.scanned, bt.scannedAt, bt.scannedBy,
            u.fullname, u.phonenumber,
            scanner.fullname AS scannedByName
     FROM booked_tickets bt
     JOIN users u ON u.id = bt.userId
     LEFT JOIN users scanner ON scanner.id = bt.scannedBy
     WHERE bt.eventId = ?
     ORDER BY bt.bookingDate ASC`
  ).all(req.params.eventId);

  res.json({ attendees });
}

function getStats(req, res) {
  // Ownership must be checked here too — the stats of another organizer's
  // event must never be exposed, even to an authenticated organizer.
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.eventId, req.user.id);
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

// ── Scan ──
// The backend is the single source of truth:
//   qrData (decoded QR string) → parse → ticket (from DB, by id) → the
//   ticket's own event (from DB, never from the client) → ownership check
//   against req.user.id → atomic duplicate guard → record scan → respond.
function scan(req, res) {
  const { qrData } = req.body;
  if (!qrData || typeof qrData !== "string") {
    return res.status(400).json({ success: false, status: "INVALID", error: "qrData is required.", message: "qrData is required." });
  }

  let parsed;
  try {
    parsed = JSON.parse(qrData);
  } catch {
    return res.status(400).json({ success: false, status: "INVALID", error: "Invalid QR code data.", message: "Invalid QR code data." });
  }

  // The QR must carry a positive integer ticket id. Anything else (strings,
  // zero, negatives, missing) is rejected as invalid data.
  const ticketId = Number(parsed && parsed.ticketId);
  if (!Number.isInteger(ticketId) || ticketId < 1) {
    return res.status(400).json({ success: false, status: "INVALID", error: "Invalid QR code data.", message: "Invalid QR code data." });
  }

  const ticket = db.prepare("SELECT * FROM booked_tickets WHERE id = ?").get(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, status: "INVALID", error: "Ticket not found.", message: "Ticket not found." });
  }

  // New-format QRs carry a per-booking random token (booked_tickets.qrCode,
  // a crypto UUID). When present it MUST match, so a guessed ticketId alone
  // is not enough to scan. Legacy QRs that predate the token (no qrCode
  // field) still scan for backward compatibility — those older codes are
  // only protected by the organizer-ownership check below.
  if (parsed.qrCode !== undefined && parsed.qrCode !== null) {
    if (typeof parsed.qrCode !== "string" || parsed.qrCode !== ticket.qrCode) {
      return res.status(400).json({ success: false, status: "INVALID", error: "Invalid QR code data.", message: "Invalid QR code data." });
    }
  }

  // The event is derived from the stored ticket — a client-supplied eventId
  // is never trusted. Only the organizer who owns the event may scan.
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(ticket.eventId, req.user.id);
  if (!event) {
    return res.status(403).json({ success: false, status: "REJECTED", error: "You are not authorized to scan tickets for this event.", message: "You are not authorized to scan tickets for this event." });
  }

  // Duplicate-scan protection is enforced atomically by the database itself:
  // only a row with scanned = 0 can be flipped to 1, and this single UPDATE
  // reports exactly how many rows changed. Two concurrent scans of the same
  // ticket can never both succeed — the loser's UPDATE matches 0 rows.
  const now = new Date().toISOString();
  const result = db.prepare(
    "UPDATE booked_tickets SET scanned = 1, scannedAt = ?, scannedBy = ? WHERE id = ? AND scanned = 0"
  ).run(now, req.user.id, ticket.id);

  if (result.changes === 0) {
    return res.json({
      success: false,
      status: "EXPIRED",
      message: "This ticket has already been used.",
      ticketId: ticket.id,
      quantity: ticket.quantity,
      scannedAt: ticket.scannedAt,
      scannedBy: ticket.scannedBy,
    });
  }

  res.json({
    success: true,
    status: "APPROVED",
    message: "Ticket verified successfully.",
    ticketId: ticket.id,
    quantity: ticket.quantity,
    scannedAt: now,
    scannedBy: req.user.id,
    event: {
      id: event.id,
      title: event.title,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
    },
  });
}

module.exports = { getEventAttendance, getStats, scan };
