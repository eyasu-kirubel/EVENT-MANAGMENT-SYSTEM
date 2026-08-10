const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const ticketController = require("../controllers/ticketController");

router.post("/book", authenticate, requireRole("user"), ticketController.book);
router.get("/my", authenticate, requireRole("user"), ticketController.getMyTickets);
router.get("/:id/qr", authenticate, ticketController.getQr);
router.delete("/:id", authenticate, ticketController.cancel);

module.exports = router;
