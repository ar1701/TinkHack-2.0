const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const BaselineScreening = require("../models/baselineScreening");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Route to render the baseline screening form page
router.get("/baseline-screening", isLoggedIn, (req, res) => {
  res.render("pages/patient/baseline-screening", {
    title: "Baseline Health Screening",
    path: "/patient/baseline-screening",
    user: req.user,
  });
});

// API route to submit baseline screening data
router.post("/api/baseline-screening/submit", isLoggedIn, async (req, res) => {
  try {
    // Extract user data from request
    const formData = req.body;

    // Create a structured prompt for Gemini API
    const patientDataSummary = createPatientDataSummary(formData);

    // Ask Gemini to analyze the data
    const result = await analyzePatientData(patientDataSummary);

    // Create a new baseline screening record in database
    const newScreening = new BaselineScreening({
      patient: req.user._id,
      // Add all form fields
      currentMedications: formData.currentMedications || [],
      medicationAllergies: formData.medicationAllergies || [],
      recreationalDrugUse: formData.recreationalDrugUse,

      chronicConditions: formData.chronicConditions || [],
      pastSurgeries: formData.pastSurgeries || [],
      mentalHealthConditions: formData.mentalHealthConditions || [],

      familyHistory: formData.familyHistory || {},

      sdoh: formData.sdoh || {},

      additionalInfo: formData.additionalInfo,

      // Add the analysis results
      riskAssessment: {
        riskLevel: result.riskLevel,
        possibleIssues: result.possibleIssues,
        analysisExplanation: result.analysisExplanation,
      },
    });

    await newScreening.save();

    // Return the assessment results to the client
    res.json({
      success: true,
      analysis: result,
    });
  } catch (error) {
    console.error("Error processing baseline screening:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your health data.",
    });
  }
});

// Route to get the most recent baseline screening for the user
router.get("/api/baseline-screening/latest", isLoggedIn, async (req, res) => {
  try {
    const latestScreening = await BaselineScreening.findOne({
      patient: req.user._id,
    }).sort({ createdAt: -1 });

    if (!latestScreening) {
      return res.status(404).json({
        success: false,
        message: "No baseline screening found for this user.",
      });
    }

    res.json({
      success: true,
      screening: latestScreening,
    });
  } catch (error) {
    console.error("Error retrieving baseline screening:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving your health data.",
    });
  }
});

// Function to create a structured prompt from form data
function createPatientDataSummary(formData) {
  let summary = "PATIENT HEALTH DATA SUMMARY:\n\n";

  // Medications and drugs
  summary += "MEDICATIONS AND DRUG HISTORY:\n";
  if (formData.currentMedications && formData.currentMedications.length > 0) {
    summary += `Current Medications: ${formData.currentMedications.join(
      ", "
    )}\n`;
  } else {
    summary += "Current Medications: None reported\n";
  }

  if (formData.medicationAllergies && formData.medicationAllergies.length > 0) {
    summary += `Medication Allergies: ${formData.medicationAllergies.join(
      ", "
    )}\n`;
  } else {
    summary += "Medication Allergies: None reported\n";
  }

  summary += `Recreational Drug Use: ${
    formData.recreationalDrugUse || "Not specified"
  }\n\n`;

  // Disease history
  summary += "PERSONAL HEALTH HISTORY:\n";
  if (formData.chronicConditions && formData.chronicConditions.length > 0) {
    summary += `Chronic Conditions: ${formData.chronicConditions.join(", ")}\n`;
  } else {
    summary += "Chronic Conditions: None reported\n";
  }

  if (formData.pastSurgeries && formData.pastSurgeries.length > 0) {
    summary += `Past Surgeries/Hospitalizations: ${formData.pastSurgeries.join(
      ", "
    )}\n`;
  } else {
    summary += "Past Surgeries/Hospitalizations: None reported\n";
  }

  if (
    formData.mentalHealthConditions &&
    formData.mentalHealthConditions.length > 0
  ) {
    summary += `Mental Health Conditions: ${formData.mentalHealthConditions.join(
      ", "
    )}\n\n`;
  } else {
    summary += "Mental Health Conditions: None reported\n\n";
  }

  // Family history
  summary += "FAMILY HEALTH HISTORY:\n";
  if (formData.familyHistory) {
    const familyConditions = [];
    if (formData.familyHistory.cancer) familyConditions.push("Cancer");
    if (formData.familyHistory.heartDisease)
      familyConditions.push("Heart Disease");
    if (formData.familyHistory.diabetes) familyConditions.push("Diabetes");
    if (formData.familyHistory.autoimmune)
      familyConditions.push("Autoimmune Disorders");
    if (formData.familyHistory.mentalHealth)
      familyConditions.push("Mental Health Conditions");

    if (familyConditions.length > 0) {
      summary += `Family Conditions: ${familyConditions.join(", ")}\n`;
    } else {
      summary += "Family Conditions: None reported\n";
    }

    if (formData.familyHistory.other) {
      summary += `Other Family Conditions: ${formData.familyHistory.other}\n\n`;
    }
  } else {
    summary += "Family Conditions: None reported\n\n";
  }

  // Social determinants of health
  summary += "SOCIAL DETERMINANTS OF HEALTH:\n";
  if (formData.sdoh) {
    if (formData.sdoh.race)
      summary += `Race/Ethnicity: ${formData.sdoh.race}\n`;
    if (formData.sdoh.education)
      summary += `Education Level: ${formData.sdoh.education}\n`;
    if (formData.sdoh.housing)
      summary += `Housing Situation: ${formData.sdoh.housing}\n`;
    if (formData.sdoh.healthcareAccess)
      summary += `Healthcare Access: ${formData.sdoh.healthcareAccess}\n`;
    if (formData.sdoh.employmentStatus)
      summary += `Employment Status: ${formData.sdoh.employmentStatus}\n`;
    if (formData.sdoh.foodSecurity)
      summary += `Food Security: ${formData.sdoh.foodSecurity}\n`;
    if (formData.sdoh.transportationAccess)
      summary += `Transportation Access: ${formData.sdoh.transportationAccess}\n`;
    if (formData.sdoh.socialSupport)
      summary += `Social Support Network: ${formData.sdoh.socialSupport}\n\n`;
  }

  // Additional info
  if (formData.additionalInfo) {
    summary += "ADDITIONAL INFORMATION:\n";
    summary += formData.additionalInfo + "\n\n";
  }

  return summary;
}

// Function to analyze patient data using Gemini API
async function analyzePatientData(patientDataSummary) {
  try {
    const prompt = `
You are a healthcare risk assessment AI assistant. You'll analyze patient health data to determine risk level and identify potential health concerns.

TASK:
1. Analyze the patient data summary below
2. Classify the patient into a risk category: Low, Medium, or High
3. Identify possible health issues or concerns based on the data
4. Provide a brief explanation of your analysis

PATIENT DATA:
${patientDataSummary}

Please output your analysis in the following JSON format:
{
  "riskLevel": "Low|Medium|High",
  "possibleIssues": ["Issue 1", "Issue 2", ...],
  "analysisExplanation": "Brief explanation of analysis and recommendations"
}

Keep your response concise. The explanation should be 3-5 sentences maximum. Identify 0-5 possible issues based on the data. If no significant issues are found, include appropriate preventive care recommendations.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      // Fallback in case parsing fails
      return {
        riskLevel: "Low",
        possibleIssues: ["Unable to analyze data completely"],
        analysisExplanation:
          "The system was unable to fully analyze the provided data. Please consult with a healthcare provider for a comprehensive assessment.",
      };
    }
  } catch (error) {
    console.error("Error analyzing patient data with Gemini:", error);
    return {
      riskLevel: "Low",
      possibleIssues: ["Error in data analysis"],
      analysisExplanation:
        "There was an error analyzing your health data. Please consult with a healthcare provider for a proper assessment.",
    };
  }
}

module.exports = router;
