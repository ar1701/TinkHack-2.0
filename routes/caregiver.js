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

// Patient details route
router.get(
  "/patient/:patientId",
  isAuthenticated,
  isCaregiver,
  caregiverController.getPatientDetails
);

// Patient requests route
router.get(
  "/patient-requests",
  isAuthenticated,
  isCaregiver,
  caregiverController.getPatientRequests
);

// Accept/reject patient requests
router.post(
  "/patient-requests/:requestId/accept",
  isAuthenticated,
  isCaregiver,
  caregiverController.acceptPatientRequest
);
router.post(
  "/patient-requests/:requestId/reject",
  isAuthenticated,
  isCaregiver,
  caregiverController.rejectPatientRequest
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
