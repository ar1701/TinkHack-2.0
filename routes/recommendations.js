const express = require("express");
const router = express.Router();
const { isAuthenticated, isPatient } = require("../middleware/auth");
const { getRecommendations } = require("../utils/recommendationEngine");

/**
 * Get personalized doctor and navigator recommendations
 * based on patient's medical conditions
 */
router.get("/", isAuthenticated, isPatient, async (req, res) => {
  try {
    const recommendations = await getRecommendations(req.user._id);

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate recommendations",
      error: error.message,
    });
  }
});

module.exports = router;
