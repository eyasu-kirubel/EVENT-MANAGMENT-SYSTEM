const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { hashPassword } = require("./utils/password");

const db = new DatabaseSync(path.join(__dirname, "db.sqlite"));

db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phonenumber TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birthDate TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    isOrganizer INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE NOT NULL,
    licenceNumber TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT NOT NULL,
    price REAL DEFAULT 0,
    capacity INTEGER NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    organizerId INTEGER NOT NULL,
    FOREIGN KEY (organizerId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booked_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    eventId INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    qrCode TEXT,
    bookingDate TEXT,
    scanned INTEGER DEFAULT 0,
    scannedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phonenumber TEXT NOT NULL,
    code TEXT NOT NULL,
    expiresAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    codeHash TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    createdAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    codeHash TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    resetToken TEXT,
    resetTokenExpiresAt TEXT,
    createdAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
`);


const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);

// Migration: status ('active' | 'suspended') so admins can disable accounts
// without destroying a user's history.
if (!userColumns.includes("status")) {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
}
if (!userColumns.includes("email")) {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
}

// Migration: paymentAccount (the account customers pay to) on events.
const eventColumns = db.prepare("PRAGMA table_info(events)").all().map((c) => c.name);
if (!eventColumns.includes("paymentAccount")) {
  db.exec("ALTER TABLE events ADD COLUMN paymentAccount TEXT");
}

// Migration: paymentAccounts — JSON array of {method, number} so an event can
// have several accounts (Telebirr, M-PESA, CBE...) to pay to.
if (!eventColumns.includes("paymentAccounts")) {
  db.exec("ALTER TABLE events ADD COLUMN paymentAccounts TEXT");
}

// Migration: visibility — 'public' (default, shown to everyone) or 'private'
// (only visible to the organizer and invited guests).
if (!eventColumns.includes("visibility")) {
  db.exec("ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'public'");
}

// Migration: private_event_guests — tracks who is invited to a private event.
// userId is set when the guest is a registered user; NULL for unregistered.
const pegExists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'private_event_guests'").get();
if (!pegExists) {
  db.exec(`
CREATE TABLE IF NOT EXISTS private_event_guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId INTEGER NOT NULL,
    userId INTEGER,
    fullname TEXT,
    phonenumber TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(eventId, phonenumber)
);
CREATE INDEX IF NOT EXISTS idx_peg_eventId ON private_event_guests(eventId);
CREATE INDEX IF NOT EXISTS idx_peg_userId ON private_event_guests(userId);
  `);
}

// Migration: record how/who a booking was paid with.
const ticketColumns = db.prepare("PRAGMA table_info(booked_tickets)").all().map((c) => c.name);
if (!ticketColumns.includes("paymentMethod")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN paymentMethod TEXT");
}
if (!ticketColumns.includes("paidTo")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN paidTo TEXT");
}

// Migration: ticketTiers — JSON array of {name, price, capacity} so an event
// can sell General/VIP/VVIP sections at different prices. The old flat
// price/capacity columns stay as the "General" default.
if (!eventColumns.includes("ticketTiers")) {
  db.exec("ALTER TABLE events ADD COLUMN ticketTiers TEXT");
}

// Migration: record which section a booking's tickets are for.
if (!ticketColumns.includes("tier")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN tier TEXT DEFAULT 'General'");
}

// Migration: snapshot the per-ticket price at purchase time, so revenue math
// stays correct even if the event's price/tier prices change later.
if (!ticketColumns.includes("unitPrice")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN unitPrice REAL DEFAULT 0");
}

// Migration: email verification. New accounts are created with
// emailVerified = 0 and must verify their email before they can log in.
// Existing accounts are backfilled to verified (1) so this change never
// locks out accounts that existed before email verification was introduced.
if (!userColumns.includes("emailVerified")) {
  db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0");
  db.exec("UPDATE users SET emailVerified = 1");
}

// Migration: dedicated "tickets" table — one row per ticket TYPE an event
// offers (Normal / VIP / VVIP / legacy General). This is now the
// authoritative source for ticket prices and per-type availability.
// events.ticketTiers (JSON) is kept in sync for backward compatibility with
// older clients that still read it.
const ticketsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tickets'").get();
if (!ticketsTableExists) {
  db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId INTEGER NOT NULL,
    ticketType TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    soldQuantity INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(eventId, ticketType)
);
CREATE INDEX IF NOT EXISTS idx_tickets_eventId ON tickets(eventId);
  `);
}

// Migration: link each purchase to its ticket-TYPE row. Existing bookings are
// backfilled below; new bookings set it at booking time. NULL-safe: legacy
// bookings that predate the tickets table keep working without a link.
const ticketCols = db.prepare("PRAGMA table_info(booked_tickets)").all().map((c) => c.name);
if (!ticketCols.includes("ticketId")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN ticketId INTEGER");
}

// Migration: attendance audit trail — which organizer scanned each booking.
// scannedBy holds the users.id of the organizer who admitted the ticket
// (NULL when never scanned). Kept as a plain INTEGER, consistent with the
// other added columns on this table, so deleting a user who previously
// scanned a ticket never breaks on a foreign key.
if (!ticketCols.includes("scannedBy")) {
  db.exec("ALTER TABLE booked_tickets ADD COLUMN scannedBy INTEGER");
}

// Migration: backfill the tickets table from each event's legacy ticketTiers
// JSON (only when there are no ticket rows yet, so it never duplicates or
// overwrites data), computing soldQuantity from existing bookings, and link
// those bookings to their new ticket rows. Nothing existing is deleted.
const ticketRowCount = db.prepare("SELECT COUNT(*) AS c FROM tickets").get().c;
if (ticketRowCount === 0) {
  const events = db.prepare("SELECT id, ticketTiers FROM events").all();
  for (const ev of events) {
    let tiers = [];
    try {
      const parsed = JSON.parse(ev.ticketTiers || "[]");
      if (Array.isArray(parsed)) tiers = parsed;
    } catch {}
    for (const t of tiers) {
      if (!t || !t.name || String(t.name).trim() === "") continue;
      const sold = db.prepare(
        "SELECT COALESCE(SUM(quantity), 0) AS s FROM booked_tickets WHERE eventId = ? AND tier = ?"
      ).get(ev.id, t.name).s;
      const ins = db.prepare(
        "INSERT INTO tickets (eventId, ticketType, price, quantity, soldQuantity) VALUES (?, ?, ?, ?, ?)"
      ).run(ev.id, String(t.name).trim(), Number(t.price) || 0, Number(t.capacity) || 0, sold);
      db.prepare(
        "UPDATE booked_tickets SET ticketId = ? WHERE eventId = ? AND tier = ? AND ticketId IS NULL"
      ).run(ins.lastInsertRowid, ev.id, t.name);
    }
  }
}

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare(
    "INSERT INTO users (fullname, phonenumber, password, role, emailVerified) VALUES (?, ?, ?, ?, ?)"
  ).run("Admin", "0900000000", hashPassword("admin123"), "admin", 1);
}
module.exports = db;
