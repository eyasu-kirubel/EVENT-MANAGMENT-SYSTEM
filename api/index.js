const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");
const QRCode = require("qrcode");
const db = require("./database");
const { hashPassword, verifyPassword } = require("./utils/password");

const server = express();
server.use(cors());
server.use(express.json({ limit: "10mb" }));

const tokens = new Map();

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = tokens.get(auth.slice(7));
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getEventAttendeeCount(eventId) {
  const row = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM booked_tickets WHERE eventId = ?").get(eventId);
  return row.total;
}

// ── Auth ──

server.get("/auth/check-phone/:phonenumber", (req, res) => {
  const existing = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(req.params.phonenumber);
  res.json({ exists: !!existing });
});

server.post("/auth/register", (req, res) => {
  const { fullname, phonenumber, password, birthDate, role } = req.body;

  if (!fullname || !phonenumber || !password) {
    return res.status(400).json({ error: "fullname, phonenumber and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters." });
  }

  const userRole = role === "organizer" ? "organizer" : "user";
  const existing = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(phonenumber);
  if (existing) {
    return res.status(409).json({ error: "Phone number is already registered." });
  }

  const hashed = hashPassword(password);
  const result = db.prepare(
    "INSERT INTO users (fullname, phonenumber, password, birthDate, role) VALUES (?, ?, ?, ?, ?)"
  ).run(fullname, phonenumber, hashed, birthDate || null, userRole);

  if (userRole === "organizer") {
    db.prepare("INSERT INTO organizers (userId, orgName, phone, email, description, logo) VALUES (?, ?, ?, ?, ?, ?)")
      .run(result.lastInsertRowid, fullname, phonenumber, "", "", "");
  }

  const user = { id: result.lastInsertRowid, fullname, phonenumber, role: userRole };
  const token = generateToken();
  tokens.set(token, user);

  res.status(201).json({ token, user });
});

server.post("/auth/login", (req, res) => {
  const { phonenumber, password } = req.body;

  if (!phonenumber || !password) {
    return res.status(400).json({ error: "phonenumber and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE phonenumber = ?").get(phonenumber);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: "Invalid phone number or password." });
  }

  const token = generateToken();
  const userData = { id: user.id, fullname: user.fullname, phonenumber: user.phonenumber, role: user.role };
  tokens.set(token, userData);

  res.json({ token, user: userData });
});

// ── Events (public) ──

server.get("/events", (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE status = 'Approved' ORDER BY startDate ASC").all();
  res.json(events);
});

server.get("/events/:id", (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const organizer = db.prepare("SELECT fullname FROM users WHERE id = ?").get(event.organizerId);
  const ticketsSold = getEventAttendeeCount(event.id);

  res.json({
    ...event,
    organizerName: organizer ? organizer.fullname : "Unknown",
    ticketsSold,
  });
});

// ── Events (organizer) ──

server.get("/events/organizer/my-events", authenticate, requireRole("organizer"), (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate DESC").all(req.user.id);
  const result = events.map((e) => ({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  }));
  res.json(result);
});

server.post("/events", authenticate, requireRole("organizer"), (req, res) => {
  const { title, description, category, location, price, capacity, startDate, endDate, photo } = req.body;

  if (!title || !location || !capacity || !startDate || !endDate) {
    return res.status(400).json({ error: "title, location, capacity, startDate and endDate are required." });
  }

  const result = db.prepare(
    "INSERT INTO events (title, description, category, location, price, capacity, startDate, endDate, photo, organizerId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')"
  ).run(title, description || "", category || "General", location, price || 0, capacity, startDate, endDate, photo || "", req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, title, status: "Pending" });
});

server.delete("/events/:id", authenticate, requireRole("organizer"), (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }
  db.prepare("DELETE FROM booked_tickets WHERE eventId = ?").run(event.id);
  db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  res.json({ message: "Event deleted." });
});

// ── Tickets ──

server.post("/tickets/book", authenticate, requireRole("user"), (req, res) => {
  const { eventId, quantity } = req.body;
  const qty = Number(quantity) || 1;

  const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const ticketsSold = getEventAttendeeCount(eventId);
  if (qty > event.capacity - ticketsSold) {
    return res.status(400).json({ error: `Only ${event.capacity - ticketsSold} seat(s) left.` });
  }

  const qrCode = crypto.randomUUID();
  const bookingDate = new Date().toISOString();

  const result = db.prepare(
    "INSERT INTO booked_tickets (userId, eventId, quantity, qrCode, bookingDate) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, eventId, qty, qrCode, bookingDate);

  res.status(201).json({ message: "Ticket booked successfully.", bookingId: result.lastInsertRowid });
});

server.get("/tickets/my", authenticate, requireRole("user"), (req, res) => {
  const tickets = db.prepare(
    `SELECT bt.id, bt.quantity, bt.bookingDate, bt.scanned, bt.scannedAt,
            e.title AS eventTitle, e.location AS eventLocation,
            e.startDate AS eventStartDate, e.endDate AS eventEndDate
     FROM booked_tickets bt
     JOIN events e ON e.id = bt.eventId
     WHERE bt.userId = ?
     ORDER BY bt.bookingDate DESC`
  ).all(req.user.id);

  res.json(tickets);
});

server.get("/tickets/:id/qr", authenticate, (req, res) => {
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
    ts: ticket.bookingDate,
  });

  QRCode.toString(qrPayload, { type: "svg", width: 300, margin: 2 }, (err, svg) => {
    if (err) return res.status(500).json({ error: "Failed to generate QR code." });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });
});

// ── Attendance ──

server.get("/attendance/event/:eventId", authenticate, requireRole("organizer"), (req, res) => {
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
});

server.get("/attendance/stats/:eventId", authenticate, requireRole("organizer"), (req, res) => {
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
});

server.post("/attendance/scan", authenticate, requireRole("organizer"), (req, res) => {
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
});

// ── Organizer Profile ──

server.get("/organizer/profile", authenticate, requireRole("organizer"), (req, res) => {
  const profile = db.prepare("SELECT * FROM organizers WHERE userId = ?").get(req.user.id);
  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json(profile);
});

server.post("/organizer/profile", authenticate, requireRole("organizer"), (req, res) => {
  const { orgName, phone, email, description, logo } = req.body;
  if (!orgName) return res.status(400).json({ error: "Organization name is required." });

  const existing = db.prepare("SELECT id FROM organizers WHERE userId = ?").get(req.user.id);
  if (existing) {
    db.prepare("UPDATE organizers SET orgName=?, phone=?, email=?, description=?, logo=? WHERE userId=?")
      .run(orgName, phone || "", email || "", description || "", logo || "", req.user.id);
    return res.json({ message: "Profile updated.", id: existing.id });
  }

  const result = db.prepare("INSERT INTO organizers (userId, orgName, phone, email, description, logo) VALUES (?,?,?,?,?,?)")
    .run(req.user.id, orgName, phone || "", email || "", description || "", logo || "");
  res.status(201).json({ message: "Profile created.", id: result.lastInsertRowid });
});

server.delete("/organizer/profile", authenticate, requireRole("organizer"), (req, res) => {
  db.prepare("DELETE FROM organizers WHERE userId = ?").run(req.user.id);
  res.json({ message: "Profile deleted." });
});

// ── Admin: Organizer Management ──

server.get("/admin/organizers", authenticate, requireRole("admin"), (req, res) => {
  const orgs = db.prepare(
    `SELECT o.id, o.orgName, o.phone, o.email, o.description, o.logo, o.createdAt,
            u.fullname AS ownerName, u.phonenumber AS ownerPhone
     FROM organizers o
     JOIN users u ON u.id = o.userId
     ORDER BY o.createdAt DESC`
  ).all();
  res.json(orgs);
});

server.delete("/admin/organizers/:id", authenticate, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM organizers WHERE id = ?").run(req.params.id);
  res.json({ message: "Organizer profile deleted." });
});

// ── Admin ──

server.get("/admin/stats", authenticate, requireRole("admin"), (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get().c;
  const totalOrganizers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'organizer'").get().c;
  const totalOrganizerProfiles = db.prepare("SELECT COUNT(*) AS c FROM organizers").get().c;
  const totalEvents = db.prepare("SELECT COUNT(*) AS c FROM events").get().c;
  const pendingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Pending'").get().c;
  const approvedEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Approved'").get().c;
  const totalTickets = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS c FROM booked_tickets").get().c;

  res.json({ totalUsers, totalOrganizers, totalOrganizerProfiles, totalEvents, pendingEvents, approvedEvents, totalTickets });
});

server.get("/admin/users", authenticate, requireRole("admin"), (req, res) => {
  const users = db.prepare("SELECT id, fullname, phonenumber, birthDate, role FROM users ORDER BY id ASC").all();
  res.json(users);
});

server.put("/admin/users/:id/role", authenticate, requireRole("admin"), (req, res) => {
  const { role } = req.body;
  if (!["user", "organizer", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json({ message: "Role updated." });
});

server.delete("/admin/users/:id", authenticate, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM booked_tickets WHERE userId = ?").run(req.params.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "User deleted." });
});

server.get("/admin/events/pending", authenticate, requireRole("admin"), (req, res) => {
  const events = db.prepare(
    `SELECT e.id, e.title, e.category, e.location, e.startDate, e.endDate, e.capacity,
            u.fullname AS organizerName
     FROM events e
     JOIN users u ON u.id = e.organizerId
     WHERE e.status = 'Pending'
     ORDER BY e.startDate ASC`
  ).all();
  res.json(events);
});

server.put("/admin/events/:id/approve", authenticate, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE events SET status = 'Approved' WHERE id = ?").run(req.params.id);
  res.json({ message: "Event approved." });
});

server.put("/admin/events/:id/reject", authenticate, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE events SET status = 'Rejected' WHERE id = ?").run(req.params.id);
  res.json({ message: "Event rejected." });
});

// ── Start ──

server.listen(3000, () => console.log("Server running on port 3000"));
