const express = require("express");

const server = express();

server.get("/events", (request, response) => {
  response.json([
    { event_name: "Concert", startDate: "16-07-2025", endDate: "21-07-2025" },
  ]);
});

server.listen(3000, () => console.log("Server is listening!"));

/**
 * - list event /events
 *
 *
 *  */
