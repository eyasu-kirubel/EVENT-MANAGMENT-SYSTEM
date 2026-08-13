const router = require("express").Router();
const authController = require("../controllers/authController");

router.get("/check-phone/:phonenumber", authController.checkPhone);
router.get("/check-licence/:licenceNumber", authController.checkLicence);
router.get("/check-email/:email", authController.checkEmail);
router.post("/register", authController.register);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
