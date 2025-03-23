const User = require("../models/user");
const Patient = require("../models/patient");
const Caregiver = require("../models/caregiver");
const PatientRequest = require("../models/patientRequest");
const MedicalRecord = require("../models/medicalRecord");
const { getRecommendations } = require("../utils/recommendationEngine");

// Get all caregivers listing
exports.getCaregivers = async (req, res) => {
  try {
    // Find the patient record or create one if it doesn't exist
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = new Patient({
        user: req.user._id,
        fullName: req.user.fullName,
      });
      await patient.save();
    }

    // Get all verified caregivers
    let caregivers = await Caregiver.find().populate("user", "fullName email");

    // If no caregivers found, create a demo caregiver
    if (caregivers.length === 0) {
      console.log("No caregivers found, creating a demo caregiver");

      // Check if demo caregiver user exists
      let demoUser = await User.findOne({ username: "democaregiver" });

      if (!demoUser) {
        // Create demo user
        demoUser = new User({
          username: "democaregiver",
          fullName: "Dr. John Doe",
          email: "demo.caregiver@example.com",
          userType: "Caregiver",
          age: 35,
          phone: "123-456-7890",
          sex: "Male",
          address: "123 Medical Center Blvd, New York, NY",
        });

        // Register with a default password
        await User.register(demoUser, "password123");
      }

      // Create demo caregiver profile
      const demoCaregiver = new Caregiver({
        user: demoUser._id,
        fullName: demoUser.fullName,
        gender: "Male",
        speciality: "General Care",
        qualification: "MD",
        experience: 5,
        hospital: "Central Hospital",
        location: "New York",
        languages: "English, Spanish",
        licenseNumber: "MD12345",
        bio: "Experienced caregiver with a focus on geriatric care.",
        isVerified: true,
      });

      await demoCaregiver.save();

      // Fetch caregivers again including the new demo
      caregivers = await Caregiver.find().populate("user", "fullName email");
    }

    // Get all requests from this patient to filter out already requested caregivers
    const patientRequests = await PatientRequest.find({ patient: patient._id });

    // Map caregivers with request status
    const mappedCaregivers = caregivers.map((caregiver) => {
      const existingRequest = patientRequests.find(
        (req) => req.caregiver.toString() === caregiver._id.toString()
      );

      return {
        caregiver,
        requestStatus: existingRequest ? existingRequest.status : null,
      };
    });

    res.render("pages/patient/caregivers", {
      title: "Find a Caregiver",
      user: req.user,
      patient,
      caregivers: mappedCaregivers,
      path: "/patient/caregivers",
    });
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    res.status(500).render("error", {
      message: "Failed to load caregivers",
      error,
    });
  }
};

// Send request to caregiver
exports.sendCaregiverRequest = async (req, res) => {
  try {
    const { caregiverId, reason } = req.body;

    // Find the patient or create if not exists
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = new Patient({
        user: req.user._id,
        fullName: req.user.fullName,
      });
      await patient.save();
    }

    // Check if request already exists
    const existingRequest = await PatientRequest.findOne({
      patient: patient._id,
      caregiver: caregiverId,
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "You have already sent a request to this caregiver",
      });
    }

    // Create new request
    const newRequest = new PatientRequest({
      patient: patient._id,
      caregiver: caregiverId,
      reason,
    });

    await newRequest.save();

    res.status(200).json({
      success: true,
      message: "Request sent successfully!",
    });
  } catch (error) {
    console.error("Error sending caregiver request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send request",
    });
  }
};

// Get my caregiver requests
exports.getMyCaregiverRequests = async (req, res) => {
  try {
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      return res.redirect("/patient/caregivers");
    }

    // Get all requests from this patient
    const requests = await PatientRequest.find({ patient: patient._id })
      .populate("caregiver")
      .sort({ createdAt: -1 });

    res.render("pages/patient/caregiver-requests", {
      title: "My Caregiver Requests",
      user: req.user,
      patient,
      requests,
      path: "/patient/caregiver-requests",
    });
  } catch (error) {
    console.error("Error fetching caregiver requests:", error);
    res.status(500).render("error", {
      message: "Failed to load caregiver requests",
      error,
    });
  }
};

// Cancel a caregiver request
exports.cancelCaregiverRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    // Find the request
    const request = await PatientRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Make sure the request belongs to this patient
    if (request.patient.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to cancel this request",
      });
    }

    // Make sure the request is pending
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    // Delete the request
    await PatientRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: "Request cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling caregiver request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel request",
    });
  }
};

// Export all controller functions
module.exports = exports;

// Get prescription analysis page
exports.getPrescriptionAnalysis = async (req, res) => {
  try {
    // Find the patient record or create one if it doesn't exist
    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      patient = new Patient({
        user: req.user._id,
        fullName: req.user.fullName,
      });
      await patient.save();
    }

    // Render the prescription analysis page
    res.render("pages/patient/prescription-analysis", {
      title: "Prescription Text Extraction",
      user: req.user,
      patient,
      path: "/patient/prescription-analysis",
      features: {
        tesseractOcr: true, // Enable Tesseract OCR feature
        geminiAi: true, // Enable Gemini AI analysis feature
      },
    });
  } catch (error) {
    console.error("Error loading prescription analysis page:", error);
    res.status(500).render("error", {
      message: "Failed to load prescription analysis page",
      error,
    });
  }
};

// Get request caregiver page
exports.getRequestCaregiverPage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.redirect("/patient/caregivers");
    }

    // Find the caregiver
    const caregiver = await Caregiver.findById(id).populate(
      "user",
      "fullName email"
    );
    if (!caregiver) {
      return res.redirect("/patient/caregivers");
    }

    res.render("pages/patient/request-caregiver", {
      title: "Request Caregiver",
      user: req.user,
      patient,
      caregiver,
      path: "/patient/caregivers",
    });
  } catch (error) {
    console.error("Error loading request caregiver page:", error);
    res.status(500).render("error", {
      message: "Failed to load request page",
      error,
    });
  }
};

// Handle caregiver request form submission
exports.requestCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).send("Reason for request is required");
    }

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    // Find the caregiver
    const caregiver = await Caregiver.findById(id);
    if (!caregiver) {
      return res.status(404).send("Caregiver not found");
    }

    // Check if request already exists
    const existingRequest = await PatientRequest.findOne({
      patient: patient._id,
      caregiver: caregiver._id,
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).send("Request already sent and pending");
      } else if (existingRequest.status === "accepted") {
        return res.status(400).send("This caregiver is already your doctor");
      } else {
        // If rejected, allow to send again
        existingRequest.status = "pending";
        existingRequest.reason = reason;
        await existingRequest.save();
        return res.redirect(
          "/patient/caregiver-requests?message=Request+sent+successfully"
        );
      }
    }

    // Create new request
    const newRequest = new PatientRequest({
      patient: patient._id,
      caregiver: caregiver._id,
      reason,
    });

    await newRequest.save();

    res.redirect(
      "/patient/caregiver-requests?message=Request+sent+successfully"
    );
  } catch (error) {
    console.error("Error requesting caregiver:", error);
    res.status(500).send("Error processing your request");
  }
};

// Request caregiver via recommendations
exports.requestCaregiverFromRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).send("Reason for request is required");
    }

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    // Find the caregiver
    const caregiver = await Caregiver.findById(id);

    if (!caregiver) {
      return res.status(404).send("Caregiver not found");
    }

    // Check if request already exists
    const existingRequest = await PatientRequest.findOne({
      patient: patient._id,
      caregiver: caregiver._id,
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).send("Request already sent and pending");
      } else if (existingRequest.status === "accepted") {
        return res.status(400).send("This caregiver is already your doctor");
      } else {
        // If rejected, allow to send again
        existingRequest.status = "pending";
        existingRequest.reason = reason;
        await existingRequest.save();
        return res.redirect(
          "/patient/dashboard?message=Request+sent+successfully"
        );
      }
    }

    // Create new request
    const newRequest = new PatientRequest({
      patient: patient._id,
      caregiver: caregiver._id,
      reason,
    });

    await newRequest.save();

    res.redirect("/patient/dashboard?message=Request+sent+successfully");
  } catch (error) {
    console.error("Error requesting caregiver:", error);
    res.status(500).send("Error processing your request");
  }
};
