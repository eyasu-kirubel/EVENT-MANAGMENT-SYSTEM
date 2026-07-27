const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "db.sqlite"));

db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phonenumber TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birthDate TEXT,
    role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phonenumber TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birthDate TEXT,
    orgName TEXT DEFAULT '',
    email TEXT DEFAULT '',
    description TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
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
    FOREIGN KEY (organizerId) REFERENCES organizers(id) ON DELETE CASCADE
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
`);

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const { hashPassword } = require("./utils/password");
  db.prepare(
    "INSERT INTO users (fullname, phonenumber, password, role) VALUES (?, ?, ?, ?)"
  ).run("Admin", "0900000000", hashPassword("admin123"), "admin");
}

module.exports = db;
