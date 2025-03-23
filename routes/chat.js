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
  res.status(401).json({ success: false, message: "Please log in first" });
};

// Verify users have an active connection
const verifyConnection = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Check if the users have an active connection
    const connection = await NavigatorRequest.findOne({
      $or: [
        // Check if current user is patient and target is navigator
        { patient: req.user._id, navigator: userId, status: "accepted" },
        // Check if current user is navigator and target is patient
        { navigator: req.user._id, patient: userId, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        message: "You don't have an active connection with this user",
      });
    }

    next();
  } catch (error) {
    console.error("Error verifying connection:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get chat messages between current user and another user
router.get(
  "/api/chat/:userId",
  isLoggedIn,
  verifyConnection,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user._id;

      // Find messages between the two users
      const messages = await ChatMessage.find({
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId },
        ],
      }).sort({ createdAt: 1 });

      // Mark received messages as read
      await ChatMessage.updateMany(
        { sender: userId, receiver: currentUserId, read: false },
        { read: true }
      );

      res.json({ success: true, messages });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ success: false, message: "Server error" });
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
    const currentUserId = req.user._id;

    // Count unread messages
    const unreadCount = await ChatMessage.countDocuments({
      receiver: currentUserId,
      read: false,
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Error counting unread messages:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
