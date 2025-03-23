const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const caregiverSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    speciality: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
    },
    hospital: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    languages: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
    },
    certificationDocs: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    bio: {
      type: String,
    },
    workingDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    workingHoursStart: {
      type: String,
      default: "09:00",
    },
    workingHoursEnd: {
      type: String,
      default: "17:00",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    patients: [
      {
        type: Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Caregiver", caregiverSchema);
