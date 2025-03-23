const express = require("express");
const router = express.Router();
const { isAuthenticated, isCaregiver } = require("../middleware/auth");
const caregiverController = require("../controllers/caregiverController");

// Apply middleware to specific routes instead of using router.use
// Dashboard route
router.get(
  "/dashboard",
  isAuthenticated,
  isCaregiver,
  caregiverController.getDashboard
);

// Profile routes
router.get(
  "/profile",
  isAuthenticated,
  isCaregiver,
  caregiverController.getProfile
);
router.post(
  "/profile",
  isAuthenticated,
  isCaregiver,
  caregiverController.updateProfile
);

// Patient requests route
router.get(
  "/patient-requests",
  isAuthenticated,
  isCaregiver,
  caregiverController.getPatientRequests
);

// Chat routes
router.get("/chat", isAuthenticated, isCaregiver, caregiverController.getChat);
router.get(
  "/chat/:patientId",
  isAuthenticated,
  isCaregiver,
  caregiverController.getChat
);
router.post(
  "/chat/:patientId/send",
  isAuthenticated,
  isCaregiver,
  caregiverController.sendMessage
);

module.exports = router;
