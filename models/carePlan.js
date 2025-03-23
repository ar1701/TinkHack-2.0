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
        trim: true,
      },
    ],
    goals: [
      {
        type: String,
        trim: true,
      },
    ],
    nextSteps: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "Archived"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Index for faster queries
carePlanSchema.index({ patient: 1, updatedAt: -1 });

const CarePlan = mongoose.model("CarePlan", carePlanSchema);

module.exports = CarePlan;
