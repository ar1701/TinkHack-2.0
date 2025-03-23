const mongoose = require("mongoose");

const NavigatorProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  languages: {
    type: [String],
    required: true,
  },
  navigatorType: {
    type: String,
    enum: [
      "Clinical Navigator",
      "Nurse",
      "Health Practitioner",
      "Community Health Worker",
      "Medicaid - Financial/Insurance Assistance",
      "Social Worker",
      "Cancer Survivor",
      "Caregiver",
    ],
    required: true,
  },
  proofDocumentURL: {
    type: String,
    // Required only for Clinical Navigator and Nurse types
  },
  wantToBeCertified: {
    type: Boolean,
    default: false,
    // Relevant for non-Clinical Navigator and non-Nurse types
  },
  certificationStatus: {
    type: String,
    enum: ["Not Applied", "Pending", "Certified"],
    default: "Not Applied",
  },
  bio: {
    type: String,
    default: "",
  },
  specialties: {
    type: [String],
    default: [],
  },
  yearsOfExperience: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
NavigatorProfileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Automatically set certification status to "Certified" if proof document is uploaded
  if (this.proofDocumentURL && this.proofDocumentURL.length > 0) {
    this.certificationStatus = "Certified";
  }

  next();
});

module.exports = mongoose.model("NavigatorProfile", NavigatorProfileSchema);
