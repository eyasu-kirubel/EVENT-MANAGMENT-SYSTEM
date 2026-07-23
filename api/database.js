const database = require("node:sqlite");

const db = new database.DatabaseSync("db.sqlite");

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phonenumber TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birthDate TEXT
);


CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phonenumber TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isActive INTEGER DEFAULT 1
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

    FOREIGN KEY (organizerId)
        REFERENCES organizers(id)
        ON DELETE CASCADE
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

    FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (eventId)
        REFERENCES events(id)
        ON DELETE CASCADE
);
`);

try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`); } catch (e) {}
try { db.exec(`ALTER TABLE booked_tickets ADD COLUMN scanned INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE booked_tickets ADD COLUMN scannedAt TEXT`); } catch (e) {}

module.exports = db;

// Users table
// This table keeps information about people who register in the system.
// Users can log in, view available events, and book tickets.
//
// id: unique identifier for each user
// fullname: user's full name
// phonenumber: user's phone number (used for login)
// password: user's account password
// birthDate: user's date of birth


// Organizers table
// This table stores people who manage events.
// Organizers can create, update, and delete their events.
//
// id: unique identifier for each organizer
// fullname: organizer's full name
// phonenumber: organizer's phone number
// password: organizer's account password
// isActive: shows whether the organizer account is active or not


// Events table
// This table stores all events available in the system.
// Each event belongs to an organizer who created it.
//
// id: unique identifier for each event
// photo: image of the event
// title: name of the event
// description: details about the event
// category: type of event (concert, seminar, workshop, etc.)
// location: place where the event happens
// price: ticket cost
// startDate: when the event starts
// endDate: when the event ends
// status: current state of the event (Pending, Approved, or Rejected)
// organizerId: connects the event with its organizer


// Booked tickets table
// This table keeps records of tickets booked by users.
// It connects users with the events they booked.
//
// id: unique booking identifier
// userId: identifies the user who booked the ticket
// eventId: identifies the booked event
// quantity: number of tickets booked
// qrCode: used to verify the ticket
// bookingDate: date when the ticket was booked





































































































