const express = require("express");
const router = express.Router();
const { isAuthenticated, isPatient } = require("../middleware/auth");
const patientController = require("../controllers/patientController");

// These routes are already defined in app.js, so this file serves as a placeholder
// for organization purposes. The actual implementation is in app.js.

// Caregiver listing and request routes
router.get(
  "/patient/caregivers",
  isAuthenticated,
  isPatient,
  patientController.getCaregivers
);
router.post(
  "/patient/caregivers/request",
  isAuthenticated,
  isPatient,
  patientController.sendCaregiverRequest
);
router.get(
  "/patient/caregiver-requests",
  isAuthenticated,
  isPatient,
  patientController.getMyCaregiverRequests
);

// Prescription Analysis routes
router.get(
  "/patient/prescription-analysis",
  isAuthenticated,
  isPatient,
  patientController.getPrescriptionAnalysis
);

// Request caregiver
router.get(
  "/request-caregiver/:id",
  isAuthenticated,
  patientController.getRequestCaregiverPage
);
router.post(
  "/request-caregiver/:id",
  isAuthenticated,
  patientController.requestCaregiver
);

// Request caregiver from recommendation
router.post(
  "/request-caregiver-from-recommendation/:id",
  isAuthenticated,
  patientController.requestCaregiverFromRecommendation
);

// Export the router
module.exports = router;
