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
// Get all available events
// Only events approved by an organizer are visible to users.
//
// Supports optional query parameters:
// ?search=&category=&location=&minPrice=&maxPrice=&startDate=
server.get("/events", (request, response) => {
  const { search, category, location, minPrice, maxPrice, startDate } = request.query;



  // Validate minimum price
  if (minPrice !== undefined) {
    const min = Number(minPrice);

    if (Number.isNaN(min) || min < 0) {
      return response.status(400).json({
        success: false,
        message: "minPrice must be a non-negative number.",
      });
    }
  }

  // Validate maximum price
  if (maxPrice !== undefined) {
    const max = Number(maxPrice);

    if (Number.isNaN(max) || max < 0) {
      return response.status(400).json({
        success: false,
        message: "maxPrice must be a non-negative number.",
      });
    }
  }


  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
  ) {
    return response.status(400).json({
      success: false,
      message: "minPrice cannot be greater than maxPrice.",
    });
  }

  
  if (
    startDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
  ) {
    return response.status(400).json({
      success: false,
      message: "startDate must be in YYYY-MM-DD format.",
    });
  }

  

  const conditions = ["status = 'Approved'"];
  const params = [];

  // Search by event title (case-insensitive)
  if (search) {
    conditions.push("LOWER(title) LIKE LOWER(?)");
    params.push(`%${search}%`);
  }

  // Filter by category
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  // Filter by location
  if (location) {
    conditions.push("location = ?");
    params.push(location);
  }

  // Filter by minimum price
  if (minPrice !== undefined) {
    conditions.push("price >= ?");
    params.push(Number(minPrice));
  }

  // Filter by maximum price
  if (maxPrice !== undefined) {
    conditions.push("price <= ?");
    params.push(Number(maxPrice));
  }

  // Filter by start date
  if (startDate) {
    conditions.push("startDate >= ?");
    params.push(startDate);
  }

  const whereClause = conditions.join(" AND ");

  // Execute query
  const events = db
    .prepare(
      `SELECT *
       FROM events
       WHERE ${whereClause}
       ORDER BY startDate ASC`
    )
    .all(...params);

  response.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
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




// AS ORGANIZER

// Register as Organizer
server.post("/register/organizer", (request, response) => {
const { fullname, phonenumber, password } = request.body;

  
  if (!fullname || !phonenumber || !password) {
    return response.status(400).json({
      success: false,
      message: "fullname, phonenumber and password are required.",
    });
  }
  if (password.length < 6) {
    return response.status(400).json({ success: false, message: "password must be at least 6 characters." });
  }

  
  const existing = db.prepare("SELECT id FROM organizers WHERE phonenumber = ?").get(phonenumber);
  if (existing) {
    return response.status(409).json({ success: false, message: "Phone number is already registered." });
  }

  
  const hashedPassword = hashPassword(password);

  
  const result = db
    .prepare("INSERT INTO organizers (fullname, phonenumber, password) VALUES (?, ?, ?)")
    .run(fullname, phonenumber, hashedPassword);

  response.status(201).json({
    success: true,
    message: "Organizer registered successfully.",
    data: { id: result.lastInsertRowid, fullname, phonenumber, isActive: 1 },
  });
});

// Organizer Login
server.post("/organizer/login", (request, response) => {
const { phonenumber, password } = request.body;

  
  if (!phonenumber || !password) {
    return response.status(400).json({ success: false, message: "phonenumber and password are required." });
  }

  
  const organizer = db.prepare("SELECT * FROM organizers WHERE phonenumber = ?").get(phonenumber);

  
  if (!organizer || !verifyPassword(password, organizer.password)) {
    return response.status(401).json({ success: false, message: "Invalid phone number or password." });
  }

  
  if (!organizer.isActive) {
    return response.status(403).json({ success: false, message: "This organizer account has been deactivated." });
  }

  
  response.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      id: organizer.id,
      fullname: organizer.fullname,
      phonenumber: organizer.phonenumber,
      isActive: organizer.isActive,
    },
  });
});



// Get organizer dashboard
server.get("/organizer/dashboard/:organizer_id", (request, response) => {
const { organizer_id } = request.params;

  
  const organizer = db.prepare("SELECT id, fullname FROM organizers WHERE id = ?").get(organizer_id);
  if (!organizer) {
    return response.status(404).json({ success: false, message: "Organizer not found." });
  }

  
  const { totalEvents } = db
    .prepare("SELECT COUNT(*) AS totalEvents FROM events WHERE organizerId = ?")
    .get(organizer_id);


  const { totalSold } = db
    .prepare(
      `SELECT COALESCE(SUM(booked_tickets.quantity), 0) AS totalSold
       FROM booked_tickets
       JOIN events ON events.id = booked_tickets.eventId
       WHERE events.organizerId = ?`
    )
    .get(organizer_id);

  const { totalCapacity } = db
    .prepare("SELECT COALESCE(SUM(capacity), 0) AS totalCapacity FROM events WHERE organizerId = ?")
    .get(organizer_id);
  const totalRemaining = totalCapacity - totalSold;

  
  const events = db
    .prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate ASC")
    .all(organizer_id);

  response.status(200).json({
    success: true,
    data: {
      totalEvents,
      totalTicketsSold: totalSold,
      totalRemainingTickets: totalRemaining,
      events,
    },
  });
});



// Create Event
server.post("/events", (request, response) => {
  const { photo, title, description, category, location, price, capacity, startDate, endDate, organizerId } =
    request.body;

  if (!title || !location || !capacity || !startDate || !endDate || !organizerId) {
    return response.status(400).json({
      success: false,
      message: "title, location, capacity, startDate, endDate and organizerId are required.",
    });
  }

  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap <= 0) {
    return response.status(400).json({ success: false, message: "capacity must be a positive integer." });
  }

  if (price !== undefined && (typeof price !== "number" || price < 0)) {
    return response.status(400).json({ success: false, message: "price must be a non-negative number." });
  }

  
  const organizer = db.prepare("SELECT id FROM organizers WHERE id = ?").get(organizerId);
  if (!organizer) {
    return response.status(404).json({ success: false, message: "Organizer not found." });
  }

  
  const result = db
    .prepare(
      `INSERT INTO events (photo, title, description, category, location, price, capacity, startDate, endDate, organizerId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      photo || null,
      title,
      description || null,
      category || null,
      location,
      price || 0,
      cap,
      startDate,
      endDate,
      organizerId
    );

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid);

  response.status(201).json({ success: true, message: "Event created successfully.", data: event });
});




// View all events created by the organizer
server.get("/organizer/events/:organizer_id", (request, response) => {
   const { organizer_id } = request.params;

  
  const organizer = db.prepare("SELECT id FROM organizers WHERE id = ?").get(organizer_id);
  if (!organizer) {
    return response.status(404).json({ success: false, message: "Organizer not found." });
  }

  const events = db
    .prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate ASC")
    .all(organizer_id);

  response.status(200).json({ success: true, count: events.length, data: events });

});

// View details of one event
server.get("/organizer/events/:event_id", (request, response) => {
   const { event_id } = request.params;

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id);
  if (!event) {
    return response.status(404).json({ success: false, message: "Event not found." });
  }

  
  const { ticketsSold } = db
    .prepare("SELECT COALESCE(SUM(quantity), 0) AS ticketsSold FROM booked_tickets WHERE eventId = ?")
    .get(event_id);

  response.status(200).json({
    success: true,
    data: {
      ...event,
      ticketsSold,
      remainingTickets: event.capacity - ticketsSold,
    },
  });

});

// Update an event
server.put("/organizer/events/:event_id", (request, response) => {
  const { event_id } = request.params;

  
  const existingEvent = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id);
  if (!existingEvent) {
    return response.status(404).json({ success: false, message: "Event not found." });
  }

  
  const editableFields = [
    "photo",
    "title",
    "description",
    "category",
    "location",
    "price",
    "capacity",
    "startDate",
    "endDate",
  ];

  
  const fieldsToUpdate = editableFields.filter((field) => request.body[field] !== undefined);

  if (fieldsToUpdate.length === 0) {
    return response.status(400).json({
      success: false,
      message: `Provide at least one field to update: ${editableFields.join(", ")}.`,
    });
  }

  
  if (fieldsToUpdate.includes("capacity")) {
    const cap = Number(request.body.capacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      return response.status(400).json({ success: false, message: "capacity must be a positive integer." });
    }
  }
  if (fieldsToUpdate.includes("price")) {
    const price = Number(request.body.price);
    if (Number.isNaN(price) || price < 0) {
      return response.status(400).json({ success: false, message: "price must be a non-negative number." });
    }
  }
  if (fieldsToUpdate.includes("title") && !request.body.title) {
    return response.status(400).json({ success: false, message: "title cannot be empty." });
  }
  if (fieldsToUpdate.includes("location") && !request.body.location) {
    return response.status(400).json({ success: false, message: "location cannot be empty." });
  }


  const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
  const values = fieldsToUpdate.map((field) => request.body[field]);

  db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...values, event_id);

  const updatedEvent = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id);

  response.status(200).json({ success: true, message: "Event updated successfully.", data: updatedEvent });

});

// Delete an event
server.delete("/organizer/events/:event_id", (request, response) => {
 const { event_id } = request.params;

  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(event_id);
  if (!event) {
    return response.status(404).json({ success: false, message: "Event not found." });
  }


  db.prepare("DELETE FROM events WHERE id = ?").run(event_id);

  response.status(200).json({ success: true, message: "Event deleted successfully." });
});



// View ticket statistics for an event
server.get("/organizer/events/:event_id/tickets", (request, response) => {
 const { event_id } = request.params;

  const event = db.prepare("SELECT title, capacity FROM events WHERE id = ?").get(event_id);
  if (!event) {
    return response.status(404).json({ success: false, message: "Event not found." });
  }

  
  const bookings = db
    .prepare(
      `SELECT id AS bookingId, userId, quantity, bookingDate, qrCode
       FROM booked_tickets
       WHERE eventId = ?
       ORDER BY bookingDate DESC`
    )
    .all(event_id);

  const ticketsSold = bookings.reduce((total, booking) => total + booking.quantity, 0);

  response.status(200).json({
    success: true,
    data: {
      eventTitle: event.title,
      capacity: event.capacity,
      ticketsSold,
      remainingTickets: event.capacity - ticketsSold,
      bookings,
    },
  });
});

server.listen(3000, () => console.log("Server is listening!"));

