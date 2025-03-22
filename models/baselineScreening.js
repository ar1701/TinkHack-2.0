const mongoose = require("mongoose");

const baselineScreeningSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Drug and Medication History
  currentMedications: {
    type: [String],
    default: [],
  },
  medicationAllergies: {
    type: [String],
    default: [],
  },
  recreationalDrugUse: {
    type: String,
    enum: ["Never", "Former", "Current", "Prefer not to say"],
    default: "Never",
  },

  // Disease History
  chronicConditions: {
    type: [String],
    default: [],
  },
  pastSurgeries: {
    type: [String],
    default: [],
  },
  mentalHealthConditions: {
    type: [String],
    default: [],
  },

  // Family History
  familyHistory: {
    cancer: { type: Boolean, default: false },
    heartDisease: { type: Boolean, default: false },
    diabetes: { type: Boolean, default: false },
    autoimmune: { type: Boolean, default: false },
    mentalHealth: { type: Boolean, default: false },
    other: { type: String, default: "" },
  },

  // Social Determinants of Health
  sdoh: {
    race: { type: String, default: "" },
    education: { type: String, default: "" },
    housing: { type: String, default: "" },
    healthcareAccess: { type: String, default: "" },
    employmentStatus: { type: String, default: "" },
    foodSecurity: { type: String, default: "" },
    transportationAccess: { type: String, default: "" },
    socialSupport: { type: String, default: "" },
  },

  // Additional Information
  additionalInfo: {
    type: String,
    default: "",
  },

  // Risk Assessment Results
  riskAssessment: {
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Not Assessed"],
      default: "Not Assessed",
    },
    possibleIssues: {
      type: [String],
      default: [],
    },
    analysisExplanation: {
      type: String,
      default: "",
    },
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BaselineScreening", baselineScreeningSchema);
