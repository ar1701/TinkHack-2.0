const MedicalRecord = require("../models/medicalRecord");
const Caregiver = require("../models/caregiver");
const NavigatorProfile = require("../models/navigatorProfile");
const Patient = require("../models/patient");
const User = require("../models/user");
const BaselineScreening = require("../models/baselineScreening");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyBpwbZVpuwYwKA_F3A-bEEhvTHYjoTUIgE"
);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Get recommendations for doctors and navigators based on patient's medical conditions
 * @param {string} patientUserId - The user ID of the patient
 * @returns {Object} - Recommended doctors and navigators with confidence scores
 */
async function getRecommendations(patientUserId) {
  try {
    // Get patient data
    const patient = await Patient.findOne({ user: patientUserId });
    if (!patient) {
      throw new Error("Patient not found");
    }

    // Get patient's medical records
    const medicalRecords = await MedicalRecord.find({ patient: patientUserId })
      .sort({ recordDate: -1 })
      .limit(5);

    // Get patient's baseline screening
    const baselineScreening = await BaselineScreening.findOne({
      patient: patientUserId,
    });

    // Construct patient health profile
    let healthProfile = {
      chronic_conditions: patient.medicalHistory?.chronicConditions || [],
      allergies: patient.medicalHistory?.allergies || [],
      medications:
        patient.medicalHistory?.medications?.map((med) => med.name) || [],
      recent_records: medicalRecords.map((record) => ({
        title: record.title,
        description: record.description,
        type: record.recordType,
        date: record.recordDate,
      })),
    };

    // Add baseline screening data if available
    if (baselineScreening) {
      healthProfile.screening = {
        chronic_conditions: baselineScreening.chronicConditions,
        current_medications: baselineScreening.currentMedications,
        allergies: baselineScreening.medicationAllergies,
        mental_health: baselineScreening.mentalHealthConditions,
        family_history: baselineScreening.familyHistory,
        risk_assessment: baselineScreening.riskAssessment,
      };
    }

    // Find all available caregivers (doctors)
    const caregivers = await Caregiver.find({ isVerified: true })
      .populate("user", "fullName email")
      .limit(20);

    // Find all available navigators
    const navigatorUsers = await User.find({
      userType: "Patient-Navigator",
    }).select("_id");

    const navigatorIds = navigatorUsers.map((u) => u._id);
    const navigators = await NavigatorProfile.find({
      user: { $in: navigatorIds },
      certificationStatus: "Certified",
    })
      .populate("user", "fullName email")
      .limit(20);

    // Use Gemini to analyze and match best fit doctors and navigators
    const prompt = `
    You are a medical recommendation system. Based on the patient's health profile, recommend the most suitable doctors and patient navigators.
    
    PATIENT HEALTH PROFILE:
    ${JSON.stringify(healthProfile, null, 2)}
    
    AVAILABLE DOCTORS:
    ${JSON.stringify(
      caregivers.map((caregiver) => ({
        id: caregiver._id.toString(),
        name: caregiver.user?.fullName || "Unknown",
        speciality: caregiver.speciality || "General",
        qualification: caregiver.qualification || "",
        experience: caregiver.experience || 0,
        hospital: caregiver.hospital || "",
        languages: caregiver.languages || "",
        bio: caregiver.bio || "",
      })),
      null,
      2
    )}
    
    AVAILABLE NAVIGATORS:
    ${JSON.stringify(
      navigators.map((navigator) => ({
        id: navigator._id.toString(),
        name: navigator.user?.fullName || "Unknown",
        navigatorType: navigator.navigatorType || "",
        languages: navigator.languages || [],
        specialties: navigator.specialties || [],
        experience: navigator.yearsOfExperience || 0,
        bio: navigator.bio || "",
        location: navigator.location || "",
      })),
      null,
      2
    )}
    
    Please analyze the patient's health conditions, medical records, and baseline screening (if available).
    Then recommend up to 3 doctors and up to 3 patient navigators who would be the best match for this patient.
    
    For each recommendation, provide:
    1. The ID of the doctor/navigator
    2. A confidence score (0-100)
    3. A brief explanation of why they are recommended
    
    Return your response in the following JSON format:
    {
      "doctors": [
        {
          "id": "doctor_id",
          "confidence": 85,
          "reason": "Explanation for recommendation"
        }
      ],
      "navigators": [
        {
          "id": "navigator_id",
          "confidence": 90,
          "reason": "Explanation for recommendation"
        }
      ],
      "health_summary": "Brief summary of key health conditions detected"
    }
    
    Response:
    `;

    // Get recommendation from Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the response (handling potential formatting issues)
    let recommendations;
    try {
      // Find JSON content within the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in the response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {
        doctors: [],
        navigators: [],
        health_summary: "Could not analyze health data at this time.",
      };
    }

    // Enrich recommendations with full doctor/navigator objects
    const enrichedDoctors = recommendations.doctors
      .map((rec) => {
        const doctor = caregivers.find((c) => c._id.toString() === rec.id);
        return {
          ...rec,
          doctor: doctor
            ? {
                id: doctor._id,
                name: doctor.user?.fullName || "Unknown",
                speciality: doctor.speciality || "General Medicine",
                hospital: doctor.hospital || "",
                experience: doctor.experience || 0,
                profileImage: doctor.profileImage || "/img/default-doctor.png",
              }
            : null,
        };
      })
      .filter((rec) => rec.doctor !== null);

    const enrichedNavigators = recommendations.navigators
      .map((rec) => {
        const navigator = navigators.find((n) => n._id.toString() === rec.id);
        return {
          ...rec,
          navigator: navigator
            ? {
                id: navigator._id,
                name: navigator.user?.fullName || "Unknown",
                type: navigator.navigatorType || "",
                specialties: navigator.specialties || [],
                experience: navigator.yearsOfExperience || 0,
              }
            : null,
        };
      })
      .filter((rec) => rec.navigator !== null);

    return {
      doctors: enrichedDoctors,
      navigators: enrichedNavigators,
      health_summary: recommendations.health_summary || "",
    };
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
}

module.exports = {
  getRecommendations,
};
