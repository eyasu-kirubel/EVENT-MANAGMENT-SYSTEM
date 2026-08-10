const router = require("express").Router();
const { authenticate, requireOrganizer } = require("../middleware/auth");
const attendanceController = require("../controllers/attendanceController");

router.get("/event/:eventId", authenticate, requireOrganizer, attendanceController.getEventAttendance);
router.get("/stats/:eventId", authenticate, requireOrganizer, attendanceController.getStats);
router.post("/scan", authenticate, requireOrganizer, attendanceController.scan);

module.exports = router;
