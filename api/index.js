const express = require("express");
const db = require("./database");

db;

const server = express();

// Register as User
server.post("/register/user", (request, response) => {

});

// Login
server.post("/login", (request, response) => {

});


// Get all available events
server.get("/events", (request, response) => {

});

// Get details of a specific event
server.get("/events/:event_id", (request, response) => {

});


// Book ticket for an event
server.post("/bookings", (request, response) => {

});

// View all bookings of a user
server.get("/bookings/user/:user_id", (request, response) => {

});

// View a specific booking
server.get("/bookings/:booking_id", (request, response) => {

});

// Cancel a booking
server.delete("/bookings/:booking_id", (request, response) => {

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
