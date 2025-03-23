const mongoose = require("mongoose");

const NavigatorRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  navigator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  navigatorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "NavigatorProfile",
    required: true,
  },
  message: {
    type: String,
    default: "I would like to connect with you as my navigator.",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
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

NavigatorRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("NavigatorRequest", NavigatorRequestSchema);
