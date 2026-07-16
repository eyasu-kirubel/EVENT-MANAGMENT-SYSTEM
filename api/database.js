const database = require("node:sqlite");

const db = new database.DatabaseSync("db.sqlite");

db.exec(`
    create table IF NOT EXISTS users  (
    id INTEGER  PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    phonenumber TEXT UNIQUE,
    password TEXT,
    birthDate Date
    )
    `);

// users - id, fullname, phonenumber, password, birthDate
// events - id, photo, title, description, price, startDate, endDate, location, catagory, organizer
// organizer - id, name, phonenumber, password, isActive
// booked_tickets - id, user, event, qrcode, date
