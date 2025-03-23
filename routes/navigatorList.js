const express = require("express");
const router = express.Router();
const User = require("../models/user");
const NavigatorProfile = require("../models/navigatorProfile");
const NavigatorRequest = require("../models/navigatorRequest");

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Please log in first" });
};

// Get all navigators with their profiles
router.get("/api/navigators", isLoggedIn, async (req, res) => {
  try {
    // Find all user accounts with userType "Patient-Navigator" and their profiles
    const navigatorProfiles = await NavigatorProfile.find()
      .populate({
        path: "user",
        select: "fullName email",
        match: { userType: "Patient-Navigator" },
      })
      .sort({ createdAt: -1 });

    // Filter out any profiles where user might be null (due to matching condition)
    const validProfiles = navigatorProfiles.filter((profile) => profile.user);

    res.json({ success: true, navigators: validProfiles });
  } catch (error) {
    console.error("Error fetching navigators:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get navigator details by ID
router.get("/api/navigators/:id", isLoggedIn, async (req, res) => {
  try {
    const navigatorProfile = await NavigatorProfile.findById(
      req.params.id
    ).populate({
      path: "user",
      select: "fullName email",
    });

    if (!navigatorProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Navigator not found" });
    }

    res.json({ success: true, navigator: navigatorProfile });
  } catch (error) {
    console.error("Error fetching navigator details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Send connection request to navigator
router.post("/api/navigators/request", isLoggedIn, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.user.userType !== "Patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can send connection requests",
      });
    }

    const { navigatorProfileId, message } = req.body;

    if (!navigatorProfileId) {
      return res.status(400).json({
        success: false,
        message: "Navigator profile ID is required",
      });
    }

    // Get navigator profile
    const navigatorProfile = await NavigatorProfile.findById(
      navigatorProfileId
    );
    if (!navigatorProfile) {
      return res.status(404).json({
        success: false,
        message: "Navigator not found",
      });
    }

    // Check if request already exists
    const existingRequest = await NavigatorRequest.findOne({
      patient: req.user._id,
      navigatorProfile: navigatorProfileId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          existingRequest.status === "pending"
            ? "You already have a pending request to this navigator"
            : "You are already connected with this navigator",
      });
    }

    // Create new request
    const newRequest = new NavigatorRequest({
      patient: req.user._id,
      navigator: navigatorProfile.user,
      navigatorProfile: navigatorProfileId,
      message: message || "I would like to connect with you as my navigator.",
    });

    await newRequest.save();

    res.json({
      success: true,
      message: "Connection request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get pending requests for patient
router.get("/api/patient/navigator-requests", isLoggedIn, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.user.userType !== "Patient") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const requests = await NavigatorRequest.find({ patient: req.user._id })
      .populate({
        path: "navigator",
        select: "fullName email",
      })
      .populate("navigatorProfile")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching patient requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get pending requests for navigator
router.get(
  "/api/navigator/connection-requests",
  isLoggedIn,
  async (req, res) => {
    try {
      // Check if user is a navigator
      if (req.user.userType !== "Patient-Navigator") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const requests = await NavigatorRequest.find({
        navigator: req.user._id,
        status: "pending",
      })
        .populate({
          path: "patient",
          select: "fullName email",
        })
        .sort({ createdAt: -1 });

      res.json({ success: true, requests });
    } catch (error) {
      console.error("Error fetching navigator requests:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Update request status (accept/reject)
router.put(
  "/api/navigator/connection-requests/:id",
  isLoggedIn,
  async (req, res) => {
    try {
      // Check if user is a navigator
      if (req.user.userType !== "Patient-Navigator") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { status } = req.body;
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status (accepted/rejected) is required",
        });
      }

      const request = await NavigatorRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      // Verify the request belongs to this navigator
      if (request.navigator.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this request",
        });
      }

      request.status = status;
      await request.save();

      res.json({
        success: true,
        message: `Request ${status} successfully`,
        request,
      });
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Get active connections for patient
router.get("/api/patient/active-navigators", isLoggedIn, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.user.userType !== "Patient") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Find accepted requests
    const connections = await NavigatorRequest.find({
      patient: req.user._id,
      status: "accepted",
    })
      .populate({
        path: "navigator",
        select: "fullName email",
      })
      .populate("navigatorProfile")
      .sort({ updatedAt: -1 });

    res.json({ success: true, connections });
  } catch (error) {
    console.error("Error fetching active navigators:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get active patients for navigator
router.get("/api/navigator/active-patients", isLoggedIn, async (req, res) => {
  try {
    // Check if user is a navigator
    if (req.user.userType !== "Patient-Navigator") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Find accepted requests
    const connections = await NavigatorRequest.find({
      navigator: req.user._id,
      status: "accepted",
    })
      .populate({
        path: "patient",
        select: "fullName email",
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, connections });
  } catch (error) {
    console.error("Error fetching active patients:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
