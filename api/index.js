const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const JWT_SECRET = "event-manager-secret-key-2025";
const server = express();
server.use(express.json());

server.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") return response.sendStatus(200);
  next();
});

function authMiddleware(request, response, next) {
  const header = request.headers.authorization;
  if (!header) return response.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
    next();
  } catch {
    return response.status(401).json({ error: "Invalid token" });
  }
}

// ─── AUTH ───────────────────────────────────────────────

server.post("/auth/register", (request, response) => {
  const { fullname, phonenumber, password, birthDate, role } = request.body;

  if (!fullname || !phonenumber || !password) {
    return response.status(400).json({ error: "Name, phone, and password are required" });
  }

  const userRole = role || "user";
  const table = userRole === "organizer" ? "organizers" : "users";
  const hashed = bcrypt.hashSync(password, 10);

  try {
    const existing = db.prepare(`SELECT id FROM ${table} WHERE phonenumber = ?`).get(phonenumber);
    if (existing) {
      return response.status(400).json({ error: "Phone number already registered" });
    }

    if (userRole === "organizer") {
      const info = db.prepare(`INSERT INTO organizers (fullname, phonenumber, password) VALUES (?, ?, ?)`).run(fullname, phonenumber, hashed);
      const token = jwt.sign({ id: info.lastInsertRowid, role: "organizer" }, JWT_SECRET, { expiresIn: "7d" });
      return response.json({ token, user: { id: info.lastInsertRowid, fullname, phonenumber, role: "organizer" } });
    }

    const info = db.prepare(`INSERT INTO users (fullname, phonenumber, password, birthDate, role) VALUES (?, ?, ?, ?, ?)`).run(fullname, phonenumber, hashed, birthDate || null, userRole);
    const token = jwt.sign({ id: info.lastInsertRowid, role: userRole }, JWT_SECRET, { expiresIn: "7d" });
    response.json({ token, user: { id: info.lastInsertRowid, fullname, phonenumber, role: userRole } });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.post("/auth/login", (request, response) => {
  const { phonenumber, password } = request.body;

  if (!phonenumber || !password) {
    return response.status(400).json({ error: "Phone and password are required" });
  }

  try {
    let user = db.prepare(`SELECT * FROM users WHERE phonenumber = ?`).get(phonenumber);
    let role = "user";

    if (!user) {
      user = db.prepare(`SELECT * FROM organizers WHERE phonenumber = ?`).get(phonenumber);
      role = "organizer";
    }

    if (!user) {
      return response.status(401).json({ error: "Invalid phone or password" });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return response.status(401).json({ error: "Invalid phone or password" });
    }

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: "7d" });
    response.json({ token, user: { id: user.id, fullname: user.fullname, phonenumber: user.phonenumber, role } });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── EVENTS (PUBLIC) ────────────────────────────────────

server.get("/events", (request, response) => {
  try {
    const events = db.prepare(`SELECT * FROM events WHERE status = 'Approved'`).all();
    response.json(events);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.get("/events/:event_id", (request, response) => {
  try {
    const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(request.params.event_id);
    if (!event) return response.status(404).json({ error: "Event not found" });
    response.json(event);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── EVENTS (ORGANIZER) ─────────────────────────────────

server.get("/events/organizer/my-events", authMiddleware, (request, response) => {
  try {
    const events = db.prepare(`SELECT * FROM events WHERE organizerId = ?`).all(request.user.id);
    response.json(events);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.post("/events", authMiddleware, (request, response) => {
  const { title, description, category, location, price, capacity, startDate, endDate, photo } = request.body;

  if (!title || !location || !startDate || !endDate) {
    return response.status(400).json({ error: "Title, location, and dates are required" });
  }

  try {
    const info = db.prepare(
      `INSERT INTO events (title, description, category, location, price, capacity, startDate, endDate, photo, organizerId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(title, description || "", category || "", location, price || 0, capacity || 0, startDate, endDate, photo || "", request.user.id);

    response.json({ id: info.lastInsertRowid, message: "Event created, pending approval" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.delete("/events/:id", authMiddleware, (request, response) => {
  try {
    const event = db.prepare(`SELECT * FROM events WHERE id = ? AND organizerId = ?`).get(request.params.id, request.user.id);
    if (!event) return response.status(404).json({ error: "Event not found" });

    db.prepare(`DELETE FROM events WHERE id = ?`).run(request.params.id);
    response.json({ message: "Event deleted" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── BOOKINGS / TICKETS ─────────────────────────────────

server.post("/tickets/book", authMiddleware, (request, response) => {
  const { eventId, quantity } = request.body;

  if (!eventId) {
    return response.status(400).json({ error: "Event ID is required" });
  }

  try {
    const event = db.prepare(`SELECT * FROM events WHERE id = ? AND status = 'Approved'`).get(eventId);
    if (!event) return response.status(404).json({ error: "Event not found or not approved" });

    const qty = quantity || 1;
    const sold = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as total FROM booked_tickets WHERE eventId = ?`).get(eventId);
    if (sold.total + qty > event.capacity) {
      return response.status(400).json({ error: "Not enough tickets available" });
    }

    const bookingDate = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO booked_tickets (userId, eventId, quantity, bookingDate) VALUES (?, ?, ?, ?)`
    ).run(request.user.id, eventId, qty, bookingDate);

    response.json({ id: info.lastInsertRowid, message: "Ticket booked successfully" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.get("/tickets/my", authMiddleware, (request, response) => {
  try {
    const tickets = db.prepare(`
      SELECT bt.id, bt.quantity, bt.bookingDate, bt.scanned,
             e.title as eventTitle, e.location as eventLocation,
             e.startDate as eventStartDate, e.endDate as eventEndDate
      FROM booked_tickets bt
      JOIN events e ON bt.eventId = e.id
      WHERE bt.userId = ?
      ORDER BY bt.bookingDate DESC
    `).all(request.user.id);

    response.json(tickets);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.get("/tickets/:ticketId/qr", authMiddleware, (request, response) => {
  try {
    const ticket = db.prepare(`SELECT * FROM booked_tickets WHERE id = ? AND userId = ?`).get(request.params.ticketId, request.user.id);
    if (!ticket) return response.status(404).json({ error: "Ticket not found" });

    const qrText = ticket.qrCode || `TICKET-${ticket.id}-EVENT-${ticket.eventId}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-size="12" fill="black">${qrText}</text>
    </svg>`;

    response.header("Content-Type", "image/svg+xml").send(svg);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── ATTENDANCE (ORGANIZER) ─────────────────────────────

server.get("/attendance/event/:eventId", authMiddleware, (request, response) => {
  try {
    const attendees = db.prepare(`
      SELECT bt.id, u.fullname, u.phonenumber, bt.quantity, bt.scanned, bt.scannedAt
      FROM booked_tickets bt
      JOIN users u ON bt.userId = u.id
      WHERE bt.eventId = ?
    `).all(request.params.eventId);

    response.json({ attendees });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ──────────────────────────────────────────────

server.get("/admin/stats", authMiddleware, (request, response) => {
  try {
    const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;
    const totalOrganizers = db.prepare(`SELECT COUNT(*) as count FROM organizers`).get().count;
    const totalEvents = db.prepare(`SELECT COUNT(*) as count FROM events`).get().count;
    const pendingEvents = db.prepare(`SELECT COUNT(*) as count FROM events WHERE status = 'Pending'`).get().count;
    const approvedEvents = db.prepare(`SELECT COUNT(*) as count FROM events WHERE status = 'Approved'`).get().count;
    const totalTickets = db.prepare(`SELECT COUNT(*) as count FROM booked_tickets`).get().count;

    response.json({ totalUsers, totalOrganizers, totalEvents, pendingEvents, approvedEvents, totalTickets });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.get("/admin/events/pending", authMiddleware, (request, response) => {
  try {
    const events = db.prepare(`
      SELECT e.*, o.fullname as organizerName
      FROM events e
      JOIN organizers o ON e.organizerId = o.id
      WHERE e.status = 'Pending'
    `).all();
    response.json(events);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.put("/admin/events/:id/approve", authMiddleware, (request, response) => {
  try {
    db.prepare(`UPDATE events SET status = 'Approved' WHERE id = ?`).run(request.params.id);
    response.json({ message: "Event approved" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.put("/admin/events/:id/reject", authMiddleware, (request, response) => {
  try {
    db.prepare(`UPDATE events SET status = 'Rejected' WHERE id = ?`).run(request.params.id);
    response.json({ message: "Event rejected" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.get("/admin/users", authMiddleware, (request, response) => {
  try {
    const users = db.prepare(`SELECT id, fullname, phonenumber, birthDate, role FROM users`).all();
    const organizers = db.prepare(`SELECT id, fullname, phonenumber, 'organizer' as role FROM organizers`).all();
    response.json([...users, ...organizers]);
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.put("/admin/users/:id/role", authMiddleware, (request, response) => {
  const { role } = request.body;
  try {
    db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, request.params.id);
    response.json({ message: "Role updated" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

server.delete("/admin/users/:id", authMiddleware, (request, response) => {
  try {
    db.prepare(`DELETE FROM users WHERE id = ?`).run(request.params.id);
    response.json({ message: "User deleted" });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
});

// ─── LEGACY (kept for compatibility) ────────────────────

server.get("/post-ticket", (request, response) => {
  response.json({ message: "Legacy endpoint" });
});

// ─── START ──────────────────────────────────────────────

server.listen(3000, () => console.log("Server is listening on port 3000"));
