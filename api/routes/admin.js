const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

router.get("/organizers", authenticate, requireRole("admin"), adminController.getOrganizers);
router.delete("/organizers/:id", authenticate, requireRole("admin"), adminController.deleteOrganizer);
router.get("/stats", authenticate, requireRole("admin"), adminController.getStats);
router.get("/tickets-per-event", authenticate, requireRole("admin"), adminController.getTicketsPerEvent);
router.get("/users", authenticate, requireRole("admin"), adminController.getUsers);
router.put("/users/:id/role", authenticate, requireRole("admin"), adminController.updateUserRole);
router.put("/users/:id", authenticate, requireRole("admin"), adminController.updateUser);
router.put("/users/:id/status", authenticate, requireRole("admin"), adminController.updateUserStatus);
router.delete("/users/:id", authenticate, requireRole("admin"), adminController.deleteUser);
router.get("/events", authenticate, requireRole("admin"), adminController.getEvents);
router.get("/events/pending", authenticate, requireRole("admin"), adminController.getPendingEvents);
router.put("/events/:id/approve", authenticate, requireRole("admin"), adminController.approveEvent);
router.put("/events/:id/reject", authenticate, requireRole("admin"), adminController.rejectEvent);

module.exports = router;
