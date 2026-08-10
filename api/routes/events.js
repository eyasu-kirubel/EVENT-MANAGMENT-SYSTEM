const router = require("express").Router();
const { authenticate, requireOrganizer } = require("../middleware/auth");
const eventController = require("../controllers/eventController");

router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.get("/organizer/my-events", authenticate, requireOrganizer, eventController.getMyEvents);
router.post("/", authenticate, requireOrganizer, eventController.createEvent);
router.put("/:id", authenticate, requireOrganizer, eventController.updateEvent);
router.delete("/:id", authenticate, requireOrganizer, eventController.deleteEvent);

module.exports = router;
