const express = require("express");

const server = express();

server.get("/login", (request, response) => {
  //
});

server.get("/register", (request, response) => {
  //
});

server.get("/buy-ticket/:event_id", (request, response) => {
  const eventId = request.params.event_id;

  response.send(eventId);
  //
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
