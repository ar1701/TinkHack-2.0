const mongoose = require("mongoose");

const carePlanSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    recommendations: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    goals: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    nextSteps: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    riskMitigation: [
      {
        type: String,
        trim: true,
      },
    ],
    followUpSchedule: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "Archived"],
      default: "Active",
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    overallAssessment: {
      type: String,
      trim: true,
    },
    lastReviewed: {
      type: Date,
    },
    nextReview: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for faster queries
carePlanSchema.index({ patient: 1, status: 1 });
carePlanSchema.index({ creator: 1, status: 1 });
carePlanSchema.index({ updatedAt: -1 });

const CarePlan = mongoose.model("CarePlan", carePlanSchema);

module.exports = CarePlan;
