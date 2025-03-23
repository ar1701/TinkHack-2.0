const Caregiver = require("../models/caregiver");
const Patient = require("../models/patient");
const Conversation = require("../models/conversation");
const User = require("../models/user");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Dashboard controller
exports.getDashboard = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.render("pages/caregiver/profile", {
        title: "Complete Your Profile",
        user: req.user,
        caregiver: {},
        message: "Please complete your profile information",
        path: "/caregiver/profile",
      });
    }

    // Get patient count, message count, etc.
    const patientCount = caregiver.patients ? caregiver.patients.length : 0;
    const conversationCount = await Conversation.countDocuments({
      caregiver: caregiver._id,
    });
    const unreadMessages = await Conversation.countDocuments({
      caregiver: caregiver._id,
      messages: {
        $elemMatch: {
          sender: "patient",
          read: false,
        },
      },
    });

    res.render("pages/caregiver/dashboard", {
      title: "Caregiver Dashboard",
      user: req.user,
      caregiver,
      patientCount,
      conversationCount,
      unreadMessages,
      path: "/caregiver/dashboard",
    });
  } catch (error) {
    console.error("Error in caregiver dashboard:", error);
    res.status(500).render("error", {
      message: "Failed to load dashboard",
      error,
      user: req.user,
      caregiver: {},
    });
  }
};

// Profile controller
exports.getProfile = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    // Get success message from query params if present
    const success = req.query.success || null;

    res.render("pages/caregiver/profile", {
      title: "Caregiver Profile",
      user: req.user,
      caregiver: caregiver || {},
      success,
      path: "/caregiver/profile",
    });
  } catch (error) {
    console.error("Error in caregiver profile:", error);
    res.status(500).render("error", {
      message: "Failed to load profile",
      error,
      user: req.user,
      caregiver: {},
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    // Ensure upload directories exist
    ensureDirectoryExists(
      path.join(__dirname, "../public/uploads/certifications")
    );
    ensureDirectoryExists(path.join(__dirname, "../public/uploads/profile"));

    // Find or create caregiver profile
    let caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      caregiver = new Caregiver({
        user: req.user._id,
        fullName: req.body.fullName || req.user.fullName,
        gender: req.body.gender,
        speciality: req.body.speciality,
        qualification: req.body.qualification,
        experience: req.body.experience,
        hospital: req.body.hospital,
        location: req.body.location,
        languages: req.body.languages,
        licenseNumber: req.body.licenseNumber,
        bio: req.body.bio,
        workingDays: req.body.workingDays || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        workingHoursStart: req.body.workingHoursStart || "09:00",
        workingHoursEnd: req.body.workingHoursEnd || "17:00",
      });
    } else {
      // Update existing caregiver
      caregiver.fullName = req.body.fullName || req.user.fullName;
      caregiver.gender = req.body.gender;
      caregiver.speciality = req.body.speciality;
      caregiver.qualification = req.body.qualification;
      caregiver.experience = req.body.experience;
      caregiver.hospital = req.body.hospital;
      caregiver.location = req.body.location;
      caregiver.languages = req.body.languages;
      caregiver.licenseNumber = req.body.licenseNumber;
      caregiver.bio = req.body.bio;
      caregiver.workingDays = req.body.workingDays || [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ];
      caregiver.workingHoursStart = req.body.workingHoursStart || "09:00";
      caregiver.workingHoursEnd = req.body.workingHoursEnd || "17:00";
    }

    // Handle certification document upload if provided
    if (req.files && req.files.certificationDocs) {
      const certFile = req.files.certificationDocs;
      const certFilename = `${Date.now()}-${certFile.name}`;
      const certUploadPath = path.join(
        __dirname,
        "../public/uploads/certifications",
        certFilename
      );

      await certFile.mv(certUploadPath);
      caregiver.certificationDocs = certFilename;
    }

    // Handle profile image upload if provided
    if (req.files && req.files.profileImage) {
      const profileImage = req.files.profileImage;
      const profileImageFilename = `${Date.now()}-${profileImage.name}`;
      const profileUploadPath = path.join(
        __dirname,
        "../public/uploads/profile",
        profileImageFilename
      );

      await profileImage.mv(profileUploadPath);
      caregiver.profileImage = profileImageFilename;
    }

    await caregiver.save();

    res.redirect("/caregiver/profile?success=Profile updated successfully");
  } catch (error) {
    console.error("Error updating caregiver profile:", error);
    res.status(500).render("pages/caregiver/profile", {
      title: "Caregiver Profile",
      user: req.user,
      caregiver: (await Caregiver.findOne({ user: req.user._id })) || {},
      error: "An error occurred while saving your profile",
      path: "/caregiver/profile",
    });
  }
};

// Get patient requests
exports.getPatientRequests = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.redirect(
        "/caregiver/profile?error=Please complete your profile first"
      );
    }

    // Import PatientRequest model
    const PatientRequest = require("../models/patientRequest");

    // Get all pending requests from patients
    const pendingRequests = await PatientRequest.find({
      caregiver: caregiver._id,
      status: "pending",
    }).populate("patient", "fullName");

    res.render("pages/caregiver/patient-requests", {
      title: "Patient Requests",
      user: req.user,
      caregiver,
      pendingRequests,
      path: "/caregiver/patient-requests",
    });
  } catch (error) {
    console.error("Error getting patient requests:", error);
    res.status(500).render("error", {
      message: "Failed to load patient requests",
      error,
      user: req.user,
      caregiver: {},
    });
  }
};

// Accept patient request
exports.acceptPatientRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the caregiver
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.status(403).json({
        success: false,
        message: "Caregiver profile not found",
      });
    }

    // Find and update the request
    const PatientRequest = require("../models/patientRequest");
    const request = await PatientRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Make sure the request is for this caregiver
    if (request.caregiver.toString() !== caregiver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this request",
      });
    }

    // Update request status
    request.status = "accepted";
    await request.save();

    // Add patient to caregiver's patients list if not already there
    if (!caregiver.patients.includes(request.patient)) {
      caregiver.patients.push(request.patient);
      await caregiver.save();
    }

    // Also update Patient model to include this caregiver
    const Patient = require("../models/patient");
    const patient = await Patient.findById(request.patient);

    if (patient && !patient.caregivers.includes(caregiver._id)) {
      patient.caregivers.push(caregiver._id);
      await patient.save();
    }

    res.status(200).json({
      success: true,
      message: "Request accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting patient request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept request",
    });
  }
};

// Reject patient request
exports.rejectPatientRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the caregiver
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.status(403).json({
        success: false,
        message: "Caregiver profile not found",
      });
    }

    // Find and update the request
    const PatientRequest = require("../models/patientRequest");
    const request = await PatientRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Make sure the request is for this caregiver
    if (request.caregiver.toString() !== caregiver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this request",
      });
    }

    // Update request status
    request.status = "rejected";
    await request.save();

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting patient request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject request",
    });
  }
};

// Chat functionality
exports.getChat = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.redirect(
        "/caregiver/profile?error=Please complete your profile first"
      );
    }

    // Get all conversations for this caregiver
    const conversations = await Conversation.find({
      caregiver: caregiver._id,
      isActive: true,
    }).populate("patient");

    // Format conversations for display
    const formattedConversations = conversations.map((conv) => {
      const lastMsg =
        conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1]
          : { content: "No messages yet", createdAt: conv.createdAt };

      const unread = conv.messages.some(
        (msg) => msg.sender === "patient" && !msg.read
      );

      return {
        patientId: conv.patient._id,
        patientName: conv.patient.fullName,
        lastMessage: lastMsg.content,
        lastMessageTime: new Date(lastMsg.createdAt).toLocaleString(),
        unread: unread,
      };
    });

    // Check if we have a specific chat open
    let activeChat = null;
    if (req.params.patientId) {
      const conversation = await Conversation.findOne({
        caregiver: caregiver._id,
        patient: req.params.patientId,
        isActive: true,
      }).populate("patient");

      if (conversation) {
        // Mark all patient messages as read
        conversation.messages.forEach((msg) => {
          if (msg.sender === "patient") {
            msg.read = true;
          }
        });
        await conversation.save();

        activeChat = {
          patientId: conversation.patient._id,
          patientName: conversation.patient.fullName,
          messages: conversation.messages.map((msg) => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date(msg.createdAt).toLocaleString(),
            read: msg.read,
          })),
        };
      }
    }

    res.render("caregiver/chat", {
      title: "Patient Chat",
      user: req.user,
      caregiver,
      conversations: formattedConversations,
      activeChat,
      path: "/caregiver/chat",
    });
  } catch (error) {
    console.error("Error in caregiver chat:", error);
    res.status(500).render("error", {
      message: "Failed to load chat",
      error,
    });
  }
};

// Appointments management
exports.getAppointments = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res.redirect(
        "/caregiver/profile?error=Please complete your profile first"
      );
    }

    // In a real implementation, you would fetch appointments from your database
    // For now, we'll use static data
    const todayAppointments = 6;
    const upcomingAppointments = 14;
    const completedAppointments = 8;
    const pendingAppointments = 5;

    res.render("pages/caregiver/appointment-management", {
      title: "Appointment Management",
      user: req.user,
      caregiver,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      pendingAppointments,
      path: "/caregiver/appointments",
    });
  } catch (error) {
    console.error("Error in caregiver appointments:", error);
    res.status(500).render("error", {
      message: "Failed to load appointments",
      error,
      user: req.user,
      caregiver: {},
    });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { message } = req.body;
    const caregiver = await Caregiver.findOne({ user: req.user._id });

    if (!caregiver) {
      return res
        .status(403)
        .json({ success: false, message: "Caregiver profile not found" });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      caregiver: caregiver._id,
      patient: patientId,
      isActive: true,
    });

    if (!conversation) {
      conversation = new Conversation({
        caregiver: caregiver._id,
        patient: patientId,
        messages: [],
        isActive: true,
      });
    }

    // Add message
    conversation.messages.push({
      sender: "caregiver",
      content: message,
      read: false,
      createdAt: new Date(),
    });

    conversation.lastMessage = new Date();
    await conversation.save();

    res.redirect(`/caregiver/chat/${patientId}`);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

module.exports = exports;
