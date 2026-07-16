const database = require("node:sqlite");

const db = database.DatabaseSync("db.sqlite");

// users - fullname, phonenumber, password, birthDate
// events - photo, title, description, price, startDate, endDate, location, catagory, organizer
// organizer - name, phonenumber, password, isActive
// booked_tickets - user, event, qrcode, date
