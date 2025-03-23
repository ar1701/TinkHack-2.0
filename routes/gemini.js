const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CarePlan = require("../models/carePlan");
const Patient = require("../models/patient");
const { isAuthenticated } = require("../middleware/auth");

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Middleware to ensure user is authenticated
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res
    .status(401)
    .json({ success: false, message: "Authentication required" });
};

// Route to process chat messages with Gemini
router.post("/chat", isLoggedIn, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    // Get the Gemini model (using Gemini 2.0 Flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare chat context - add medical context and user information
    const userContext = `User is a ${req.user.userType} on a medical platform called MedConnect.`;
    const medicalContext =
      "This is a healthcare platform for patients, caregivers, and patient navigators. Responses should be helpful, accurate, and maintain medical privacy standards.";

    const topicConstraint = `
    IMPORTANT: You are a medical assistant. Only respond to health-related queries.
    If a user asks about anything not related to health, medicine, wellness, healthcare services, 
    or the MedConnect platform, politely redirect them to ask health-related questions instead.
    Example response for non-health topics: "I'm designed to help with health-related questions. 
    Please ask me about medical conditions, wellness tips, healthcare services, or how to use 
    the MedConnect platform."
    `;

    const formattingInstructions = `
    Please format your responses in a clean, structured way:
    1. For emphasis, use plain text instead of asterisks, or use HTML <strong> tags if needed
    2. For bullet points, use the format "* item" with a space after the asterisk
    3. For numbered lists, use the format "1. item" with a space after the number
    4. Separate paragraphs with a blank line
    5. Keep responses concise and well-organized
    `;

    // Prepare the prompt with context
    const prompt = `${medicalContext} ${userContext}\n\n${topicConstraint}\n\n${formattingInstructions}\n\nUser query: ${message}\n\nPlease provide a helpful response:`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      response: text,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process your request with Gemini",
      error: error.message,
    });
  }
});

// Generate care plan using Gemini AI
router.post(
  "/generate-care-plan/:patientId",
  isAuthenticated,
  async (req, res) => {
    try {
      const patientId = req.params.patientId;

      // Get patient data
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });
      }

      // Import required model
      const MedicalRecord = require("../models/medicalRecord");
      const BaselineScreening = require("../models/baselineScreening");

      // Get patient's medical records and screening results
      const medicalRecords = await MedicalRecord.find({
        patient: patientId,
      }).sort("-date");
      const screening = await BaselineScreening.findOne({
        patient: patientId,
      }).sort("-createdAt");

      // Prepare context for Gemini
      const context = {
        patient: {
          name: patient.fullName,
          age: patient.age,
          gender: patient.gender,
        },
        medicalHistory: medicalRecords.map((record) => ({
          condition: record.title,
          description: record.description,
          date: record.date,
        })),
        screening: screening
          ? {
              riskLevel: screening.riskAssessment.riskLevel,
              healthConcerns: screening.riskAssessment.possibleIssues,
              vitals: screening.vitals,
            }
          : null,
      };

      // Generate care plan using Gemini
      const prompt = `As a healthcare professional, analyze the following patient data and generate a comprehensive care plan. The plan should include specific recommendations, goals, and next steps based on the patient's medical history and current health status.

Patient Information:
${JSON.stringify(context, null, 2)}

Please provide a structured care plan with the following sections:
1. Overall Assessment
2. Key Health Goals
3. Specific Recommendations
4. Next Steps
5. Risk Mitigation Strategies
6. Follow-up Schedule

Format the response in JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const carePlanSuggestion = JSON.parse(response.text());

      // Create new care plan
      const carePlan = new CarePlan({
        patient: patientId,
        creator: req.user._id,
        title: `Care Plan for ${patient.fullName}`,
        recommendations: carePlanSuggestion.recommendations || [],
        goals: carePlanSuggestion.goals || [],
        nextSteps: carePlanSuggestion.nextSteps || [],
        riskMitigation: carePlanSuggestion.riskMitigation || [],
        followUpSchedule: carePlanSuggestion.followUpSchedule,
        status: "Active",
      });

      await carePlan.save();

      res.json({
        success: true,
        message: "Care plan generated successfully",
        carePlan: carePlan,
      });
    } catch (error) {
      console.error("Error generating care plan:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate care plan",
        error: error.message,
      });
    }
  }
);

// Let's add some caregiver-related routes to handle profile and chat functionality
router.post("/caregiver/update-profile", isAuthenticated, async (req, res) => {
  try {
    // Ensure the user is a caregiver
    if (req.user.role !== "caregiver") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Access denied. Not a caregiver account.",
        });
    }

    const Caregiver = require("../models/caregiver");

    // Find or create caregiver profile
    let caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      caregiver = new Caregiver({
        user: req.user._id,
        fullName: req.body.fullName,
        speciality: req.body.speciality,
        qualification: req.body.qualification,
        experience: req.body.experience,
        hospital: req.body.hospital,
        location: req.body.location,
        languages: req.body.languages,
        licenseNumber: req.body.licenseNumber,
      });
    } else {
      // Update existing caregiver
      caregiver.fullName = req.body.fullName;
      caregiver.speciality = req.body.speciality;
      caregiver.qualification = req.body.qualification;
      caregiver.experience = req.body.experience;
      caregiver.hospital = req.body.hospital;
      caregiver.location = req.body.location;
      caregiver.languages = req.body.languages;
      caregiver.licenseNumber = req.body.licenseNumber;
    }

    // Handle certification document upload if provided
    if (req.file) {
      caregiver.certificationDocs = req.file.filename;
    }

    await caregiver.save();

    res.json({
      success: true,
      message: "Caregiver profile updated successfully",
      caregiver: caregiver,
    });
  } catch (error) {
    console.error("Error updating caregiver profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update caregiver profile",
      error: error.message,
    });
  }
});

module.exports = router;
