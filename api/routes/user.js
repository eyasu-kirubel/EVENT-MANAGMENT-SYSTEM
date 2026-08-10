const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const userController = require("../controllers/userController");

router.put("/profile", authenticate, userController.updateProfile);

module.exports = router;
