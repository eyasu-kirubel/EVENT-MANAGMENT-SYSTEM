const router = require("express").Router();
const { authenticate, requireOrganizer } = require("../middleware/auth");
const organizerController = require("../controllers/organizerController");

router.get("/stats", authenticate, requireOrganizer, organizerController.getStats);
router.get("/events/recent", authenticate, requireOrganizer, organizerController.getRecentEvents);
router.get("/profile", authenticate, requireOrganizer, organizerController.getProfile);
router.put("/profile", authenticate, requireOrganizer, organizerController.updateProfile);

module.exports = router;
