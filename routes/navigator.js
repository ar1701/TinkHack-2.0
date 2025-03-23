const express = require("express");
const router = express.Router();
const User = require("../models/user");
const NavigatorRequest = require("../models/navigatorRequest");
const MedicalRecord = require("../models/medicalRecord");
const BaselineScreening = require("../models/baselineScreening");
const CarePlan = require("../models/carePlan");

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Please log in first" });
};

// Middleware to check if the user is a navigator
const isNavigator = (req, res, next) => {
  if (req.user.userType === "Patient-Navigator") {
    return next();
  }
  res.status(403).json({ success: false, message: "Access denied" });
};

// Get patient's medical records (for navigator)
router.get(
  "/api/navigator/patient/:patientId/medical-records",
  isLoggedIn,
  isNavigator,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      // Check if navigator has a connection with this patient
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You don't have an active connection with this patient",
        });
      }

      // Get patient's medical records
      const records = await MedicalRecord.find({ user: patientId }).sort({
        uploadDate: -1,
      });

      res.json({
        success: true,
        records,
      });
    } catch (error) {
      console.error("Error fetching patient medical records:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// Get patient's baseline screening data (for navigator)
router.get(
  "/api/navigator/patient/:patientId/baseline-screening",
  isLoggedIn,
  isNavigator,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      // Check if navigator has a connection with this patient
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You don't have an active connection with this patient",
        });
      }

      // Get patient's latest baseline screening
      const screening = await BaselineScreening.findOne({
        user: patientId,
      }).sort({ createdAt: -1 });

      if (!screening) {
        return res.json({
          success: true,
          screening: null,
          message: "Patient has not completed a baseline screening yet",
        });
      }

      res.json({
        success: true,
        screening,
      });
    } catch (error) {
      console.error("Error fetching patient baseline screening:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// Create or update a care plan for a patient
router.post(
  "/api/navigator/patient/:patientId/care-plan",
  isLoggedIn,
  isNavigator,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { title, recommendations, goals, nextSteps, notes } = req.body;

      // Check if navigator has a connection with this patient
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You don't have an active connection with this patient",
        });
      }

      // Check if required fields are provided
      if (!title || !recommendations) {
        return res.status(400).json({
          success: false,
          message: "Title and recommendations are required",
        });
      }

      // Check if a care plan already exists for this patient by this navigator
      let carePlan = await CarePlan.findOne({
        patient: patientId,
        creator: req.user._id,
      });

      if (carePlan) {
        // Update existing care plan
        carePlan.title = title;
        carePlan.recommendations = recommendations;
        carePlan.goals = goals || [];
        carePlan.nextSteps = nextSteps || [];
        carePlan.notes = notes || "";
        carePlan.updatedAt = Date.now();

        await carePlan.save();

        res.json({
          success: true,
          message: "Care plan updated successfully",
          carePlan,
        });
      } else {
        // Create a new care plan
        const newCarePlan = new CarePlan({
          patient: patientId,
          creator: req.user._id,
          title,
          recommendations,
          goals: goals || [],
          nextSteps: nextSteps || [],
          notes: notes || "",
        });

        await newCarePlan.save();

        res.json({
          success: true,
          message: "Care plan created successfully",
          carePlan: newCarePlan,
        });
      }
    } catch (error) {
      console.error("Error creating/updating care plan:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// Get care plans for a patient (for both navigator and patient views)
router.get("/api/care-plans/:patientId", isLoggedIn, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Different permission checks based on user type
    if (req.user.userType === "Patient") {
      // If user is a patient, they can only view their own care plans
      if (req.user._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own care plans",
        });
      }
    } else if (req.user.userType === "Patient-Navigator") {
      // If user is a navigator, they must have an active connection with the patient
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You don't have an active connection with this patient",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get care plans for this patient
    const carePlans = await CarePlan.find({ patient: patientId })
      .populate({
        path: "creator",
        select: "fullName email",
      })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      carePlans,
    });
  } catch (error) {
    console.error("Error fetching care plans:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Generate a care plan using Gemini API
router.post(
  "/api/navigator/patient/:patientId/generate-care-plan",
  isLoggedIn,
  isNavigator,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      // Check if navigator has a connection with this patient
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You don't have an active connection with this patient",
        });
      }

      // Get patient info
      const patient = await User.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      // Get patient's latest baseline screening
      const screening = await BaselineScreening.findOne({
        user: patientId,
      }).sort({ createdAt: -1 });

      if (!screening) {
        return res.status(400).json({
          success: false,
          message: "Patient has not completed a baseline screening yet",
        });
      }

      // Prepare data for AI
      const patientData = {
        age: patient.age,
        sex: patient.sex,
        riskLevel: screening.riskAssessment.riskLevel,
        possibleIssues: screening.riskAssessment.possibleIssues,
        analysisExplanation: screening.riskAssessment.analysisExplanation,
        screeningData: {
          healthIndicators: screening.healthIndicators,
          lifestyleFactors: screening.lifestyleFactors,
          symptoms: screening.symptoms,
          medicalHistory: screening.medicalHistory,
        },
      };

      // Now call the Gemini API to generate a care plan
      // This would typically be a real API call, but for demonstration we'll create some mock data
      // In a real implementation, you would make an API call to Gemini here

      const mockGeneratedCarePlan = {
        title: `Care Plan for ${patient.fullName}`,
        recommendations: [
          "Schedule a follow-up appointment with primary care physician",
          "Monitor blood pressure daily",
          "Begin a light exercise routine 3 times per week",
          "Reduce sodium intake in diet",
        ],
        goals: [
          "Reduce blood pressure to normal range within 3 months",
          "Increase physical activity gradually",
          "Improve sleep quality",
        ],
        nextSteps: [
          "Book appointment with Dr. Smith within 2 weeks",
          "Start using blood pressure monitor daily",
          "Begin food journaling to track nutritional intake",
        ],
        notes:
          "Patient shows good motivation to improve health. Focus on gradual lifestyle changes rather than drastic modifications.",
      };

      res.json({
        success: true,
        generatedCarePlan: mockGeneratedCarePlan,
      });
    } catch (error) {
      console.error("Error generating care plan:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
