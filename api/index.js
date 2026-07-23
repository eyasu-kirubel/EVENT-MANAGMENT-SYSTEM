const express = require("express");
const crypto = require("node:crypto");
const db = require("./database");
const { hashPassword, verifyPassword } = require("./utils/password");
server.use(express.json());


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



// Register as User
server.post("/register/user", (request, response) => {
 const { fullname, phonenumber, password, birthDate } = request.body;

  if (!fullname || !phonenumber || !password) {
    return response.status(400).json({
      success: false,
      message: "fullname, phonenumber and password are required.",
    });
  }
  if (password.length < 6) {
    return response.status(400).json({ success: false, message: "password must be at least 6 characters." });
  }


  const existing = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(phonenumber);
  if (existing) {
    return response.status(409).json({ success: false, message: "Phone number is already registered." });
  }


  const hashedPassword = hashPassword(password);


  const result = db
    .prepare("INSERT INTO users (fullname, phonenumber, password, birthDate) VALUES (?, ?, ?, ?)")
    .run(fullname, phonenumber, hashedPassword, birthDate || null);

  response.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: { id: result.lastInsertRowid, fullname, phonenumber, birthDate: birthDate || null },
  });
});

// Login
server.post("/login", (request, response) => {
  const { phonenumber, password } = request.body;

  if (!phonenumber || !password) {
    return response.status(400).json({ success: false, message: "phonenumber and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE phonenumber = ?").get(phonenumber);

  if (!user || !verifyPassword(password, user.password)) {
    return response.status(401).json({ success: false, message: "Invalid phone number or password." });
  }

  response.status(200).json({
    success: true,
    message: "Login successful.",
    data: { id: user.id, fullname: user.fullname, phonenumber: user.phonenumber, birthDate: user.birthDate },
  });

});


// Get all available events
server.get("/events", (request, response) => {
   const events = db
    .prepare("SELECT * FROM events WHERE status = 'Approved' ORDER BY startDate ASC")
    .all();

  response.status(200).json({ success: true, count: events.length, data: events });

});

// Get details of a specific event
server.get("/events/:event_id", (request, response) => { 
 const { event_id } = request.params;

  const event = db
    .prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'")
    .get(event_id);

  if (!event) {
    return response.status(404).json({ success: false, message: "Event not found." });
  }

  // Work out how many seats are left: capacity minus everything already booked.
  const { totalBooked } = db
    .prepare("SELECT COALESCE(SUM(quantity), 0) AS totalBooked FROM booked_tickets WHERE eventId = ?")
    .get(event_id);

  response.status(200).json({
    success: true,
    data: { ...event, availableSeats: event.capacity - totalBooked },
  });

});

// Book ticket for an event
server.post("/bookings", (request, response) => {
  const { userId, eventId, quantity } = request.body;

  
  if (!userId || !eventId || !quantity) {
    return response.status(400).json({ success: false, message: "userId, eventId and quantity are required." });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return response.status(400).json({ success: false, message: "quantity must be a positive integer." });
  }

  
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) {
    return response.status(404).json({ success: false, message: "User not found." });
  }

  try {
    const bookingId = runInTransaction(() => {
      
      const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'Approved'").get(eventId);
      if (!event) {
        throw { statusCode: 404, message: "Event not found." };
      }

    
  
      const { totalBooked } = db
        .prepare("SELECT COALESCE(SUM(quantity), 0) AS totalBooked FROM booked_tickets WHERE eventId = ?")
        .get(eventId);
      const seatsLeft = event.capacity - totalBooked;

      if (qty > seatsLeft) {
        throw { statusCode: 400, message: `Only ${seatsLeft} seat(s) left for this event.` };
      }

    
      const qrCode = crypto.randomUUID();
      const bookingDate = new Date().toISOString();

      const result = db
        .prepare(
          "INSERT INTO booked_tickets (userId, eventId, quantity, qrCode, bookingDate) VALUES (?, ?, ?, ?, ?)"
        )
        .run(userId, eventId, qty, qrCode, bookingDate);

      return result.lastInsertRowid;
    });

    const booking = db.prepare("SELECT * FROM booked_tickets WHERE id = ?").get(bookingId);
    response.status(201).json({ success: true, message: "Ticket booked successfully.", data: booking });
  } catch (err) {
    if (err && err.statusCode) {
      return response.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error(err);
    response.status(500).json({ success: false, message: "Failed to book ticket." });
  }

});

// View all bookings of a user
server.get("/bookings/user/:user_id", (request, response) => {
  const { user_id } = request.params;

  const bookings = db
    .prepare(
      `SELECT booked_tickets.*, events.title AS eventTitle, events.startDate, events.location, events.photo
       FROM booked_tickets
       JOIN events ON events.id = booked_tickets.eventId
       WHERE booked_tickets.userId = ?
       ORDER BY booked_tickets.bookingDate DESC`
    )
    .all(user_id);

  response.status(200).json({ success: true, count: bookings.length, data: bookings });

});

// View a specific booking
server.get("/bookings/:booking_id", (request, response) => {
  const { booking_id } = request.params;

  const booking = db
    .prepare(
      `SELECT booked_tickets.*, events.title AS eventTitle, events.startDate, events.location, events.photo
       FROM booked_tickets
       JOIN events ON events.id = booked_tickets.eventId
       WHERE booked_tickets.id = ?`
    )
    .get(booking_id);

  if (!booking) {
    return response.status(404).json({ success: false, message: "Booking not found." });
  }

  response.status(200).json({ success: true, data: booking });

});

// Cancel a booking
server.delete("/bookings/:booking_id", (request, response) => {
  const { booking_id } = request.params;

  const booking = db.prepare("SELECT * FROM booked_tickets WHERE id = ?").get(booking_id);
  if (!booking) {
    return response.status(404).json({ success: false, message: "Booking not found." });
  }

  db.prepare("DELETE FROM booked_tickets WHERE id = ?").run(booking_id);

  response.status(200).json({ success: true, message: "Booking cancelled successfully." });

});


// Pay for a booking
server.post("/payments", (request, response) => {

});


// AS ORGANIZER
server.get("/post-ticket", (request, response) => {
  //
});

server.get("/events", (request, response) => {
  response.json([
    { event_name: "Concert", startDate: "16-07-2025", endDate: "21-07-2025" },
  ]);
});

server.listen(3000, () => console.log("Server is listening!"));

/**
 * - as a customer
 * /events
 * /login
 * /register
 * /book-ticket
 * /pay
 *
 * - as organize
 * /post-event
 * /check-event
 * /delete-event
 *
 * - as admin
 * /approve-event
 * /reject-event
 *
 *
 *  */
