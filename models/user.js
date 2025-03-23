const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  sex: {
    type: String,
    enum: ["Male", "Female"],
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  userType: {
    type: String,
    enum: ["Patient", "Patient-Navigator", "Caregiver"],
    required: true,
  },
});

// Add username, hash and salt field to schema
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
