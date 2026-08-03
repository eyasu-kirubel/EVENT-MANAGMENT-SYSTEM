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

// ── Small transaction helper ──
// node:sqlite has no built-in db.transaction(fn) like better-sqlite3 does,
// so multi-step writes that must succeed or fail together (e.g. "insert a
// user, then insert their organizer profile") are wrapped in BEGIN/COMMIT,
// rolling back automatically if anything inside throws.
function runInTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// Shapes a "users" row into the safe object we hand back to the client and
// store against a token. Centralized here so every place that issues a
// token (register, login) stays in sync automatically.
function toPublicUser(userRow) {
  return {
    id: userRow.id,
    fullname: userRow.fullname,
    phonenumber: userRow.phonenumber,
    email: userRow.email,
    role: userRow.role,
    isOrganizer: !!userRow.isOrganizer, // stored as 0/1 in SQLite, exposed as true/false over the API
  };
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const data = tokens.get(auth.slice(7));
  if (!data) {
    return res.status(401).json({ error: "Invalid token" });
  }
  // Re-read the user from the DB on every request so role/status changes
  // (e.g. an admin suspending someone or editing their role) take effect
  // immediately instead of waiting for the token to expire.
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(data.id);
  if (!row) {
    return res.status(401).json({ error: "Account no longer exists" });
  }
  if (row.status === "suspended") {
    return res.status(403).json({ error: "Your account has been suspended." });
  }
  req.user = toPublicUser(row);
  next();
}

// Unchanged — still checks req.user.role. Now only ever "user" or "admin",
// since organizers also carry role = "user" under the new schema.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// NEW — replaces every old requireRole("organizer") check. Organizer
// permissions are now driven by the isOrganizer flag on the user's own
// account, not by a separate organizer role/login.
//
// req.user always comes from toPublicUser() (see register/login below),
// which guarantees isOrganizer is a real boolean by the time it's stored
// on a token — so this checks `!== true` rather than a truthy/falsy or
// `!== 1` comparison, to make that guarantee explicit instead of relying
// on JS's implicit coercion to keep working.
function requireOrganizer(req, res, next) {
  if (req.user.isOrganizer !== true) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getEventAttendeeCount(eventId) {
  const row = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM booked_tickets WHERE eventId = ?").get(eventId);
  return row.total;
}

function parseTicketTiers(event) {
  if (!event) return [];
  try {
    const parsed = JSON.parse(event.ticketTiers || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validateEventDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
    return "Invalid date. Use YYYY-MM-DD.";
  }
  if (endDate < startDate) {
    return "End date must be the same as or after the start date.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(startDate) < today) {
    return "Start date cannot be in the past.";
  }
  return null;
}

function decorateEvent(event) {
  if (!event) return event;
  let accounts = [];
  try {
    const parsed = JSON.parse(event.paymentAccounts || "[]");
    if (Array.isArray(parsed)) accounts = parsed;
  } catch {}
  return {
    ...event,
    paymentAccount: accounts.length > 0 ? accounts[0].number : event.paymentAccount || null,
    paymentAccounts: accounts,
    ticketTiers: parseTicketTiers(event),
  };
}

// ── Auth: Check Phone ──
// Only "users" holds phone numbers now — organizers no longer have their
// own phonenumber column, so there's only ever one table to check.
server.get("/auth/check-phone/:phonenumber", (req, res) => {
  const existing = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(req.params.phonenumber);
  res.json({ exists: !!existing });
});

// ── Auth: Check Licence ──
server.get("/auth/check-licence/:licenceNumber", (req, res) => {
  const existing = db.prepare("SELECT id FROM organizers WHERE licenceNumber = ?").get(req.params.licenceNumber);
  res.json({ exists: !!existing });
});

// ── Auth: Check Email ──
server.get("/auth/check-email/:email", (req, res) => {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(req.params.email).trim().toLowerCase());
  res.json({ exists: !!existing });
});

// ── Auth: Register ──
server.post("/auth/register", (req, res) => {
  const { fullname, phonenumber, password, birthDate, licenceNumber, email } = req.body;

  // Accept either the new `isOrganizer: true` flag or the old
  // `role: "organizer"` shape, so an existing frontend that still sends
  // role:"organizer" keeps working without changes (requirement #5),
  // while internally we only ever use the isOrganizer flag from here on.
  const isOrganizer = req.body.isOrganizer === true || req.body.role === "organizer";

  // 1. Fields required for EVERYONE.
  if (!fullname || !phonenumber || !password) {
    return res.status(400).json({ error: "fullname, phonenumber and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters." });
  }
  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }

  // 2. Fields required ONLY for organizers.
  if (isOrganizer && !licenceNumber) {
    return res.status(400).json({ error: "licenceNumber is required to register as an organizer." });
  }

  // 3. Single uniqueness source: the users table's phonenumber column.
  const existingUser = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(phonenumber);
  if (existingUser) {
    return res.status(409).json({ error: "Phone number is already registered." });
  }

  // Email must also be unique — checked ahead of time so we return a clean
  // 409 instead of letting the same email register twice.
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  if (existingEmail) {
    return res.status(409).json({ error: "Email is already registered." });
  }

  // 4. For organizers, licenceNumber must also be unique — checked ahead of
  // time so we can return a clean 409 instead of a raw SQLite error.
  if (isOrganizer) {
    const existingLicence = db.prepare("SELECT id FROM organizers WHERE licenceNumber = ?").get(licenceNumber);
    if (existingLicence) {
      return res.status(409).json({ error: "This licence number is already registered." });
    }
  }

  const hashed = hashPassword(password);

  try {
    // 5. Insert into users, then (only if isOrganizer) insert into
    // organizers using the id we just generated. Wrapped in a transaction
    // so that if the organizers insert fails for any reason (e.g. a
    // licenceNumber collision from a simultaneous request), the users
    // insert is rolled back too — we never want a "ghost" user row with
    // isOrganizer = 1 but no matching organizer profile.
    const userId = runInTransaction(() => {
      // role is ALWAYS "user" here — organizers are not a separate role,
      // per requirement #2. isOrganizer is what carries the distinction.
      const result = db
        .prepare(
          "INSERT INTO users (fullname, phonenumber, password, birthDate, email, role, isOrganizer) VALUES (?, ?, ?, ?, ?, 'user', ?)"
        )
        .run(fullname, phonenumber, hashed, birthDate || null, email || null, isOrganizer ? 1 : 0);

      const newUserId = result.lastInsertRowid;

      if (isOrganizer) {
        db.prepare("INSERT INTO organizers (userId, licenceNumber, email) VALUES (?, ?, ?)").run(
          newUserId,
          licenceNumber,
          email
        );
      }

      return newUserId;
    });

    const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const user = toPublicUser(userRow);
    const token = generateToken();
    tokens.set(token, user);

    // Include the organizer profile in the response when relevant, so the
    // frontend has licenceNumber/email right after signup without a second request.
    const responseBody = { token, user };
    if (isOrganizer) {
      responseBody.organizer = db
        .prepare("SELECT licenceNumber, email, createdAt FROM organizers WHERE userId = ?")
        .get(userId);
    }

    res.status(201).json(responseBody);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register." });
  }
});

// ── Auth: Login ──
// ONE query, against ONE table. Organizers are users, so there's no second
// lookup to fall back to anymore (requirement #4 / #2 under Login).
server.post("/auth/login", (req, res) => {
  const { phonenumber, password } = req.body;

  if (!phonenumber || !password) {
    return res.status(400).json({ error: "phonenumber and password are required." });
  }

  const userRow = db.prepare("SELECT * FROM users WHERE phonenumber = ?").get(phonenumber);

  if (!userRow || !verifyPassword(password, userRow.password)) {
    return res.status(401).json({ error: "Invalid phone number or password." });
  }

  if (userRow.status === "suspended") {
    return res.status(403).json({ error: "Your account has been suspended. Contact support." });
  }

  const user = toPublicUser(userRow);
  const token = generateToken();
  tokens.set(token, user);

  res.json({ token, user });
});

// ── Auth: Forgot Password ──

server.post("/auth/forgot-password", (req, res) => {
  const { phonenumber, email } = req.body;
  if (!phonenumber || !email) {
    return res.status(400).json({ error: "Phone number and email are required." });
  }

  const user = db.prepare("SELECT id, email FROM users WHERE phonenumber = ?").get(phonenumber);
  if (!user) {
    return res.status(404).json({ error: "No account found with this phone number." });
  }
  if (!user.email || user.email.toLowerCase() !== String(email).toLowerCase()) {
    return res.status(403).json({ error: "Email does not match this account." });
  }

  // Generate 6-digit code valid for 15 minutes
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Delete any existing codes for this phone, then insert new one
  db.prepare("DELETE FROM reset_codes WHERE phonenumber = ?").run(phonenumber);
  db.prepare("INSERT INTO reset_codes (phonenumber, code, expiresAt) VALUES (?, ?, ?)").run(phonenumber, code, expiresAt);

  res.json({ message: "Reset code sent.", code }); // code returned since we have no SMS
});

server.post("/auth/reset-password", (req, res) => {
  const { phonenumber, code, newPassword } = req.body;

  if (!phonenumber || !code || !newPassword) {
    return res.status(400).json({ error: "phonenumber, code, and newPassword are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const reset = db.prepare("SELECT * FROM reset_codes WHERE phonenumber = ? AND code = ?").get(phonenumber, code);
  if (!reset) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  if (new Date(reset.expiresAt) < new Date()) {
    db.prepare("DELETE FROM reset_codes WHERE id = ?").run(reset.id);
    return res.status(400).json({ error: "Reset code has expired." });
  }

  const hashed = hashPassword(newPassword);
  db.prepare("UPDATE users SET password = ? WHERE phonenumber = ?").run(hashed, phonenumber);
  db.prepare("DELETE FROM reset_codes WHERE phonenumber = ?").run(phonenumber);

  res.json({ message: "Password reset successfully." });
});

// ── Events (public) ──

server.get("/events", (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE status = 'Approved' ORDER BY startDate ASC").all();
  res.json(events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  })));
});

server.get("/events/:id", (req, res) => {
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
});

// ── Events (organizer) ──
// All three routes below swap requireRole("organizer") for requireOrganizer.
// The queries themselves don't need to change: event.organizerId already
// matches req.user.id, because that id now comes from the same users table
// on both sides.

server.get("/events/organizer/my-events", authenticate, requireOrganizer, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate DESC").all(req.user.id);
  const result = events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  }));
  res.json(result);
});

// ── Organizer Dashboard ──

server.get("/organizer/stats", authenticate, requireOrganizer, (req, res) => {
  const totalEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE organizerId = ?").get(req.user.id).c;
  const pendingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE organizerId = ? AND status = 'Pending'").get(req.user.id).c;
  const totalBookings = db.prepare(
    "SELECT COUNT(*) AS c FROM booked_tickets bt JOIN events e ON e.id = bt.eventId WHERE e.organizerId = ?"
  ).get(req.user.id).c;
  const totalRevenue = db.prepare(
    "SELECT COALESCE(SUM(bt.unitPrice * bt.quantity), 0) AS c FROM booked_tickets bt JOIN events e ON e.id = bt.eventId WHERE e.organizerId = ?"
  ).get(req.user.id).c;

  res.json({ totalEvents, pendingEvents, totalBookings, totalRevenue });
});

server.get("/organizer/events/recent", authenticate, requireOrganizer, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate DESC LIMIT 5").all(req.user.id);
  const result = events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  }));
  res.json(result);
});

server.post("/events", authenticate, requireOrganizer, (req, res) => {
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
});

server.put("/events/:id", authenticate, requireOrganizer, (req, res) => {
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
});

server.delete("/events/:id", authenticate, requireOrganizer, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND organizerId = ?").get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }
  db.prepare("DELETE FROM booked_tickets WHERE eventId = ?").run(event.id);
  db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  res.json({ message: "Event deleted." });
});

// ── Tickets ──
// Unchanged, on purpose. requireRole("user") already covers organizers too,
// because organizers now carry role = "user" — this is exactly what
// requirement #3 ("organizers automatically get everything a normal user
// can do") looks like in code: nothing special needed here at all.

server.post("/tickets/book", authenticate, requireRole("user"), (req, res) => {
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
});

server.get("/tickets/my", authenticate, requireRole("user"), (req, res) => {
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
    tier: ticket.tier || "General",
    ts: ticket.bookingDate,
  });

  QRCode.toString(qrPayload, { type: "svg", width: 300, margin: 2 }, (err, svg) => {
    if (err) return res.status(500).json({ error: "Failed to generate QR code." });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });
});

// ── Delete Booking ──
server.delete("/tickets/:id", authenticate, (req, res) => {
  const ticket = db.prepare("SELECT * FROM booked_tickets WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }
  db.prepare("DELETE FROM booked_tickets WHERE id = ?").run(ticket.id);
  res.json({ message: "Booking cancelled." });
});

// ── Attendance ──
// All three swap requireRole("organizer") for requireOrganizer. Queries are
// unchanged — event.organizerId already equals req.user.id (a users.id).

server.get("/attendance/event/:eventId", authenticate, requireOrganizer, (req, res) => {
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

server.get("/attendance/stats/:eventId", authenticate, requireOrganizer, (req, res) => {
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

server.post("/attendance/scan", authenticate, requireOrganizer, (req, res) => {
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
// Rewritten: organizers no longer stores fullname/phonenumber/orgName/
// description/logo — only id, userId, licenceNumber, email, createdAt. We
// join back to "users" to still return the person's name/phone alongside
// their organizer-specific fields, so the response stays as complete as
// before even though the underlying columns moved.

server.get("/organizer/profile", authenticate, requireOrganizer, (req, res) => {
  const profile = db
    .prepare(
      `SELECT o.id, o.userId, o.licenceNumber, o.email, o.createdAt,
              u.fullname, u.phonenumber
       FROM organizers o
       JOIN users u ON u.id = o.userId
       WHERE o.userId = ?`
    )
    .get(req.user.id);

  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json(profile);
});

server.put("/organizer/profile", authenticate, requireOrganizer, (req, res) => {
  const { email, licenceNumber, fullname, phonenumber } = req.body;

  const current = db.prepare("SELECT * FROM organizers WHERE userId = ?").get(req.user.id);
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  // Build updates
  const newEmail = email !== undefined && email !== null ? String(email).trim() : current.email;
  const newLicence = licenceNumber !== undefined && licenceNumber !== null ? String(licenceNumber).trim() : current.licenceNumber;
  const newName = fullname !== undefined && fullname !== null ? String(fullname).trim() : currentUser.fullname;
  const newPhone = phonenumber !== undefined && phonenumber !== null ? String(phonenumber).trim() : currentUser.phonenumber;

  if (!newName) {
    return res.status(400).json({ error: "Full name cannot be empty." });
  }
  if (!newPhone) {
    return res.status(400).json({ error: "Phone number cannot be empty." });
  }
  if (newEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const emailClash = db
      .prepare("SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(?) AND id != ?")
      .get(newEmail.toLowerCase(), req.user.id);
    if (emailClash) {
      return res.status(409).json({ error: "Email is already in use." });
    }
    const orgEmailClash = db
      .prepare("SELECT id FROM organizers WHERE LOWER(TRIM(email)) = LOWER(?) AND userId != ?")
      .get(newEmail.toLowerCase(), req.user.id);
    if (orgEmailClash) {
      return res.status(409).json({ error: "Email is already in use." });
    }
  }

  if (newLicence) {
    const clash = db
      .prepare("SELECT id FROM organizers WHERE licenceNumber = ? AND userId != ?")
      .get(newLicence, req.user.id);
    if (clash) {
      return res.status(409).json({ error: "This licence number is already registered." });
    }
  }

  const phoneClash = db
    .prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?")
    .get(newPhone, req.user.id);
  if (phoneClash) {
    return res.status(409).json({ error: "Phone number is already in use." });
  }

  db.prepare("UPDATE organizers SET email = ?, licenceNumber = ? WHERE userId = ?").run(
    newEmail,
    newLicence,
    req.user.id
  );

  // Also update user's fullname and phonenumber if provided
  db.prepare("UPDATE users SET fullname = ?, phonenumber = ? WHERE id = ?").run(newName, newPhone, req.user.id);

  res.json({ message: "Profile updated." });
});

// ── User Profile ──

server.put("/user/profile", authenticate, (req, res) => {
  const { fullname, phonenumber, email } = req.body;

  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  const newFullname = fullname !== undefined && fullname !== null ? String(fullname).trim() : current.fullname;
  const newPhone = phonenumber !== undefined && phonenumber !== null ? String(phonenumber).trim() : current.phonenumber;
  const newEmail = email !== undefined && email !== null ? String(email).trim() : current.email;

  if (!newFullname) {
    return res.status(400).json({ error: "Full name cannot be empty." });
  }
  if (!newPhone) {
    return res.status(400).json({ error: "Phone number cannot be empty." });
  }
  if (newEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const emailClash = db
      .prepare("SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(?) AND id != ?")
      .get(newEmail.toLowerCase(), req.user.id);
    if (emailClash) {
      return res.status(409).json({ error: "Email is already in use." });
    }
  }

  const phoneClash = db
    .prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?")
    .get(newPhone, req.user.id);
  if (phoneClash) {
    return res.status(409).json({ error: "Phone number is already in use." });
  }

  db.prepare("UPDATE users SET fullname = ?, phonenumber = ?, email = ? WHERE id = ?").run(
    newFullname,
    newPhone,
    newEmail,
    req.user.id
  );

  res.json({ message: "Profile updated." });
});

// ── Admin: Organizer Management ──

server.get("/admin/organizers", authenticate, requireRole("admin"), (req, res) => {
  // organizers no longer carries identity fields itself, so we join to
  // users for fullname/phonenumber.
  const orgs = db
    .prepare(
      `SELECT o.id, o.userId, u.fullname, u.phonenumber, o.licenceNumber, o.email, o.createdAt
       FROM organizers o
       JOIN users u ON u.id = o.userId
       ORDER BY o.createdAt DESC`
    )
    .all();
  res.json(orgs);
});

server.delete("/admin/organizers/:id", authenticate, requireRole("admin"), (req, res) => {
  
  const organizer = db.prepare("SELECT * FROM organizers WHERE id = ?").get(req.params.id);
  if (!organizer) {
    return res.status(404).json({ error: "Organizer not found." });
  }

  runInTransaction(() => {
    db.prepare("DELETE FROM events WHERE organizerId = ?").run(organizer.userId);
    db.prepare("DELETE FROM organizers WHERE id = ?").run(organizer.id);
    db.prepare("UPDATE users SET isOrganizer = 0 WHERE id = ?").run(organizer.userId);
  });

  res.json({ message: "Organizer deleted." });
});

// ── Admin ──

server.get("/admin/stats", authenticate, requireRole("admin"), (req, res) => {
  // totalUsers now specifically means "plain users who are not organizers",
  // so it keeps meaning what it always meant, even though organizers also
  // technically have role = 'user' now. totalOrganizers is unaffected —
  // it's still just a row count of the organizers table.
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user' AND isOrganizer = 0").get().c;
  const totalOrganizers = db.prepare("SELECT COUNT(*) AS c FROM organizers").get().c;
  const totalEvents = db.prepare("SELECT COUNT(*) AS c FROM events").get().c;
  const pendingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Pending'").get().c;
  const approvedEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Approved'").get().c;
  const totalTickets = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS c FROM booked_tickets").get().c;

  res.json({ totalUsers, totalOrganizers, totalEvents, pendingEvents, approvedEvents, totalTickets });
});

// Tickets sold broken down per event, with the organizer's name, capacity and
// the revenue (quantity × price). Used by the admin "Tickets by Event" page.
server.get("/admin/tickets-per-event", authenticate, requireRole("admin"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.category, e.location, e.startDate, e.capacity, e.price,
              u.fullname AS organizerName,
              COALESCE(SUM(bt.quantity), 0) AS ticketsSold,
              ROUND(COALESCE(SUM(bt.quantity * bt.unitPrice), 0), 2) AS revenue
       FROM events e
       JOIN users u ON u.id = e.organizerId
       LEFT JOIN booked_tickets bt ON bt.eventId = e.id
       GROUP BY e.id
       ORDER BY ticketsSold DESC, e.startDate ASC`
    )
    .all();

  // Per-section breakdown for each event.
  const tierRows = db.prepare(
    `SELECT eventId, tier, COALESCE(SUM(quantity), 0) AS sold,
            ROUND(COALESCE(SUM(quantity * unitPrice), 0), 2) AS revenue
     FROM booked_tickets GROUP BY eventId, tier`
  ).all();
  const tierMap = {};
  for (const r of tierRows) {
    if (!tierMap[r.eventId]) tierMap[r.eventId] = [];
    tierMap[r.eventId].push({ name: r.tier, sold: r.sold, revenue: r.revenue });
  }

  res.json(rows.map((r) => ({ ...r, tiers: tierMap[r.id] || [] })));
});

server.get("/admin/users", authenticate, requireRole("admin"), (req, res) => {
  // isOrganizer added to the SELECT (additive, non-breaking) so the admin
  // panel can tell organizers apart from plain users in this same list.
  const users = db
    .prepare(
      `SELECT u.id, u.fullname, u.phonenumber, u.email, u.birthDate, u.role, u.isOrganizer, u.status,
              (SELECT COUNT(*) FROM events e WHERE e.organizerId = u.id) AS eventsCreated,
              (SELECT COALESCE(SUM(quantity), 0) FROM booked_tickets bt WHERE bt.userId = u.id) AS ticketsBooked
       FROM users u
       ORDER BY u.id ASC`
    )
    .all()
    .map((u) => ({ ...u, isOrganizer: !!u.isOrganizer }));

  res.json(users);
});

server.put("/admin/users/:id/role", authenticate, requireRole("admin"), (req, res) => {
  const { role } = req.body; // "user" | "organizer" | "admin"
  if (!["user", "organizer", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  // Demoting/removing the last admin (or self-demotion) could lock everyone
  // out of the panel, so block both.
  if (target.role === "admin" && role !== "admin") {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot change your own role." });
    }
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(400).json({ error: "At least one admin must remain." });
    }
  }
  if (role === "organizer") {
    db.prepare("UPDATE users SET role = 'user', isOrganizer = 1 WHERE id = ?").run(req.params.id);
  } else if (role === "admin") {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(req.params.id);
  } else {
    db.prepare("UPDATE users SET role = 'user', isOrganizer = 0 WHERE id = ?").run(req.params.id);
  }
  res.json({ message: "Role updated." });
});

server.put("/admin/users/:id", authenticate, requireRole("admin"), (req, res) => {
  const { fullname, phonenumber, email } = req.body;
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  if (!fullname || !fullname.trim()) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!phonenumber || !phonenumber.trim()) {
    return res.status(400).json({ error: "Phone number is required." });
  }
  const phoneTaken = db.prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?").get(phonenumber.trim(), req.params.id);
  if (phoneTaken) {
    return res.status(409).json({ error: "This phone number is already in use." });
  }
  db.prepare("UPDATE users SET fullname = ?, phonenumber = ?, email = ? WHERE id = ?").run(
    fullname.trim(),
    phonenumber.trim(),
    (email || "").trim(),
    req.params.id
  );
  res.json({ message: "User updated." });
});

server.put("/admin/users/:id/status", authenticate, requireRole("admin"), (req, res) => {
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "You cannot suspend your own account." });
  }
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: status === "suspended" ? "User suspended." : "User activated." });
});

server.delete("/admin/users/:id", authenticate, requireRole("admin"), (req, res) => {
  // A single delete is now enough: PRAGMA foreign_keys = ON (set in
  // database.js) plus ON DELETE CASCADE on organizers.userId,
  // events.organizerId, and booked_tickets.userId/eventId means SQLite
  // automatically removes this user's organizer profile (if any), every
  // event they organized (and, transitively, everyone else's tickets to
  // those events), and every ticket they personally booked.
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "User deleted." });
});

// Full list of every event (all statuses) for the admin dashboard.
server.get("/admin/events", authenticate, requireRole("admin"), (req, res) => {
  const events = db
    .prepare(
      `SELECT e.*, u.fullname AS organizerName
       FROM events e
       JOIN users u ON u.id = e.organizerId
       ORDER BY e.startDate DESC`
    )
    .all();
  res.json(events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  })));
});

server.get("/admin/events/pending", authenticate, requireRole("admin"), (req, res) => {
  // Simplified: since events.organizerId is now a users.id directly, the
  // organizer's name comes straight from "users" — the old join through
  // "organizers" is no longer necessary at all.
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
