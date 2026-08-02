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

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare(
    "INSERT INTO users (fullname, phonenumber, password, role) VALUES (?, ?, ?, ?)"
  ).run("Admin", "0900000000", hashPassword("admin123"), "admin");

}
module.exports = db;
