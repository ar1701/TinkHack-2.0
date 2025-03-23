const express = require("express");
const router = express.Router();
const CarePlan = require("../models/carePlan");
const { isLoggedIn } = require("../middleware/auth");

// Get all care plans for a patient
router.get("/api/care-plans/:patientId", isLoggedIn, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Ensure the requesting user is either the patient or their navigator
    const isPatient = req.user._id.toString() === patientId;
    const isNavigator = req.user.userType === "Patient-Navigator";

    if (!isPatient && !isNavigator) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to care plans",
      });
    }

    // Find all care plans for the patient and populate creator details
    const carePlans = await CarePlan.find({ patient: patientId })
      .populate("creator", "fullName email")
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      carePlans,
    });
  } catch (error) {
    console.error("Error fetching care plans:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch care plans",
    });
  }
});

// Create a new care plan
router.post("/api/care-plans", isLoggedIn, async (req, res) => {
  try {
    // Ensure the user is a navigator
    if (req.user.userType !== "Patient-Navigator") {
      return res.status(403).json({
        success: false,
        message: "Only navigators can create care plans",
      });
    }

    const { patient, title, recommendations, goals, nextSteps, notes } =
      req.body;

    const carePlan = new CarePlan({
      patient,
      creator: req.user._id,
      title,
      recommendations,
      goals,
      nextSteps,
      notes,
    });

    await carePlan.save();

    res.status(201).json({
      success: true,
      carePlan,
    });
  } catch (error) {
    console.error("Error creating care plan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create care plan",
    });
  }
});

// Update a care plan
router.put("/api/care-plans/:planId", isLoggedIn, async (req, res) => {
  try {
    // Ensure the user is a navigator
    if (req.user.userType !== "Patient-Navigator") {
      return res.status(403).json({
        success: false,
        message: "Only navigators can update care plans",
      });
    }

    const { planId } = req.params;
    const { title, recommendations, goals, nextSteps, notes, status } =
      req.body;

    const carePlan = await CarePlan.findById(planId);

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: "Care plan not found",
      });
    }

    // Ensure the navigator is the creator of the care plan
    if (carePlan.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update care plans you created",
      });
    }

    carePlan.title = title;
    carePlan.recommendations = recommendations;
    carePlan.goals = goals;
    carePlan.nextSteps = nextSteps;
    carePlan.notes = notes;
    if (status) carePlan.status = status;

    await carePlan.save();

    res.json({
      success: true,
      carePlan,
    });
  } catch (error) {
    console.error("Error updating care plan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update care plan",
    });
  }
});

// Delete a care plan
router.delete("/api/care-plans/:planId", isLoggedIn, async (req, res) => {
  try {
    // Ensure the user is a navigator
    if (req.user.userType !== "Patient-Navigator") {
      return res.status(403).json({
        success: false,
        message: "Only navigators can delete care plans",
      });
    }

    const { planId } = req.params;
    const carePlan = await CarePlan.findById(planId);

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: "Care plan not found",
      });
    }

    // Ensure the navigator is the creator of the care plan
    if (carePlan.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete care plans you created",
      });
    }

    await carePlan.deleteOne();

    res.json({
      success: true,
      message: "Care plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting care plan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete care plan",
    });
  }
});

module.exports = router;
