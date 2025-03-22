const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  recordType: {
    type: String,
    enum: [
      "Prescription",
      "Lab Report",
      "Imaging",
      "Discharge Summary",
      "Other",
    ],
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  recordDate: {
    type: Date,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  // For RAG
  vectorEmbedding: {
    type: [Number],
    sparse: true,
  },
  textContent: {
    type: String,
  },
  metadata: {
    type: Map,
    of: String,
  },
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
