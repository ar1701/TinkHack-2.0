require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const Caregiver = require("./models/caregiver");

async function createCaregiver() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.ATLASDB_URL || "mongodb://localhost:27017/tinkhack"
    );
    console.log("Connected to MongoDB");

    // Check if test user exists
    const userExists = await User.findOne({ username: "caregivertest" });
    let user;

    if (!userExists) {
      console.log("Creating new user...");
      user = new User({
        username: "caregivertest",
        fullName: "Dr. Maria Johnson",
        email: "maria.johnson@example.com",
        userType: "Caregiver",
        age: 38,
        phone: "555-123-4567",
        sex: "Female",
        address: "456 Healthcare Ave",
      });

      await User.register(user, "password123");
      console.log("User created:", user);
    } else {
      user = userExists;
      console.log("User already exists:", user);
    }

    // Check if caregiver profile exists
    const caregiverExists = await Caregiver.findOne({ user: user._id });

    if (!caregiverExists) {
      console.log("Creating new caregiver profile...");
      const caregiver = new Caregiver({
        user: user._id,
        fullName: user.fullName,
        gender: "Female",
        speciality: "Geriatric Care",
        qualification: "RN, BSN",
        experience: 12,
        hospital: "City Medical Center",
        location: "Chicago",
        languages: "English, French",
        licenseNumber: "RN9876543",
        bio: "Experienced nurse with focus on elder care",
        isVerified: true,
      });

      await caregiver.save();
      console.log("Caregiver created:", caregiver);
    } else {
      console.log("Caregiver already exists:", caregiverExists);
    }

    // Verify caregiver was added
    const allCaregivers = await Caregiver.find().populate("user");
    console.log("\nAll caregivers in database:");
    allCaregivers.forEach((c) =>
      console.log({
        id: c._id,
        fullName: c.fullName,
        specialty: c.speciality,
        hospital: c.hospital,
        isVerified: c.isVerified,
        user: c.user
          ? {
              id: c.user._id,
              username: c.user.username,
              fullName: c.user.fullName,
              email: c.user.email,
            }
          : null,
      })
    );

    console.log("\nDone.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

createCaregiver();
