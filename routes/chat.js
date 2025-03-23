const express = require("express");
const router = express.Router();
const User = require("../models/user");
const ChatMessage = require("../models/chatMessage");
const NavigatorRequest = require("../models/navigatorRequest");

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Not logged in" });
};

// Verify users have an active connection
const verifyConnection = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Skip verification for development/testing
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SKIP_CHAT_VERIFICATION === "true"
    ) {
      return next();
    }

    // For patient users, check if they have an accepted connection with the navigator
    if (req.user.userType === "Patient") {
      const connectionExists = await NavigatorRequest.exists({
        patient: currentUserId,
        navigator: otherUserId,
        status: "accepted",
      });

      if (!connectionExists) {
        return res.status(403).json({
          success: false,
          message: "No connection exists with this navigator",
        });
      }
    }
    // For navigators, check if they have an accepted connection with the patient
    else if (req.user.userType === "Patient-Navigator") {
      const connectionExists = await NavigatorRequest.exists({
        navigator: currentUserId,
        patient: otherUserId,
        status: "accepted",
      });

      if (!connectionExists) {
        return res.status(403).json({
          success: false,
          message: "No connection exists with this patient",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error verifying connection:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying connection",
    });
  }
};

// Get chat messages between current user and another user
router.get(
  "/api/chat/:userId",
  isLoggedIn,
  verifyConnection,
  async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const otherUserId = req.params.userId;

      // Fetch messages between these users
      const messages = await ChatMessage.find({
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(100); // Limit to last 100 messages

      // Mark all messages from other user as read
      await ChatMessage.updateMany(
        { sender: otherUserId, receiver: currentUserId, read: false },
        { read: true }
      );

      res.json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching chat history",
      });
    }
  }
);

// Send a message
router.post(
  "/api/chat/:userId",
  isLoggedIn,
  verifyConnection,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      const currentUserId = req.user._id;

      if (!message || message.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }

      // Create a new message
      const newMessage = new ChatMessage({
        sender: currentUserId,
        receiver: userId,
        message: message.trim(),
      });

      await newMessage.save();

      res.json({
        success: true,
        message: "Message sent successfully",
        chatMessage: newMessage,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Get unread message count
router.get("/api/chat/unread/count", isLoggedIn, async (req, res) => {
  try {
    const unreadCount = await ChatMessage.countDocuments({
      receiver: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unread count",
    });
  }
});

// Get all chat contacts with latest message
router.get("/api/chat/contacts/all", isLoggedIn, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all users the current user has chatted with
    const sentMessages = await ChatMessage.find({
      sender: currentUserId,
    }).distinct("receiver");
    const receivedMessages = await ChatMessage.find({
      receiver: currentUserId,
    }).distinct("sender");

    // Combine and remove duplicates
    const contactIds = [...new Set([...sentMessages, ...receivedMessages])];

    // Get user details for each contact
    const contacts = await User.find({ _id: { $in: contactIds } }).select(
      "fullName email userType"
    );

    // For each contact, get the latest message and unread count
    const contactsWithDetails = await Promise.all(
      contacts.map(async (contact) => {
        const latestMessage = await ChatMessage.findOne({
          $or: [
            { sender: currentUserId, receiver: contact._id },
            { sender: contact._id, receiver: currentUserId },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await ChatMessage.countDocuments({
          sender: contact._id,
          receiver: currentUserId,
          read: false,
        });

        return {
          _id: contact._id,
          fullName: contact.fullName,
          email: contact.email,
          userType: contact.userType,
          latestMessage: latestMessage || null,
          unreadCount,
        };
      })
    );

    // Sort by latest message date
    contactsWithDetails.sort((a, b) => {
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return b.latestMessage.createdAt - a.latestMessage.createdAt;
    });

    res.json({ success: true, contacts: contactsWithDetails });
  } catch (error) {
    console.error("Error fetching chat contacts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
