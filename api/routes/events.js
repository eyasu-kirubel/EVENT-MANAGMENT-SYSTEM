const router = require("express").Router();
const { authenticate, optionalAuth, requireOrganizer } = require("../middleware/auth");
const eventController = require("../controllers/eventController");

router.get("/", eventController.listEvents);
router.get("/:id", optionalAuth, eventController.getEvent);
router.get("/:id/tickets", eventController.listEventTickets);
router.get("/organizer/my-events", authenticate, requireOrganizer, eventController.getMyEvents);
router.post("/", authenticate, requireOrganizer, eventController.createEvent);
router.put("/:id", authenticate, requireOrganizer, eventController.updateEvent);
router.delete("/:id", authenticate, requireOrganizer, eventController.deleteEvent);
router.get("/:id/guests", authenticate, requireOrganizer, eventController.listEventGuests);
router.post("/:id/tickets", authenticate, requireOrganizer, eventController.addEventTicket);
router.put("/:id/tickets/:ticketId", authenticate, requireOrganizer, eventController.updateEventTicket);
router.delete("/:id/tickets/:ticketId", authenticate, requireOrganizer, eventController.deleteEventTicket);

module.exports = router;
