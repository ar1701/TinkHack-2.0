const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { getRecommendations } = require("../utils/recommendationEngine");

/**
 * Get personalized doctor and navigator recommendations
 * based on patient's medical conditions
 */
router.get("/", isLoggedIn, async (req, res) => {
  try {
    // Only allow patients to access this endpoint
    if (req.user.userType !== "Patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can access recommendations",
      });
    }

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
