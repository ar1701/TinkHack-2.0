const ChatMessage = require("../models/chatMessage");
const User = require("../models/user");
const NavigatorRequest = require("../models/navigatorRequest");

// Map to store user socket connections
const userSockets = new Map(); // userId -> socketId

module.exports = function (io) {
  // Socket middleware to authenticate users
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      return next(new Error("Authentication error"));
    }

    // Store user connection
    socket.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    console.log(`User connected: ${userId}`);

    // Store user's socket id
    userSockets.set(userId, socket.id);

    // Handle private message
    socket.on("private-message", async (data) => {
      try {
        const { receiverId, message } = data;

        // Verify connection between users
        const connection = await NavigatorRequest.findOne({
          $or: [
            { patient: userId, navigator: receiverId, status: "accepted" },
            { navigator: userId, patient: receiverId, status: "accepted" },
          ],
        });

        if (!connection) {
          return socket.emit("error", {
            message: "You don't have an active connection with this user",
          });
        }

        // Create and save the message
        const newMessage = new ChatMessage({
          sender: userId,
          receiver: receiverId,
          message: message.trim(),
        });

        await newMessage.save();

        // Get the sender's name for displaying in the notification
        const sender = await User.findById(userId).select("fullName");

        // Emit to receiver if online
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("new-message", {
            message: newMessage,
            sender: {
              _id: userId,
              fullName: sender.fullName,
            },
          });
        }

        // Confirm to sender
        socket.emit("message-sent", { success: true, message: newMessage });
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { receiverId, isTyping } = data;

      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user-typing", {
          userId,
          isTyping,
        });
      }
    });

    // Handle reading messages
    socket.on("mark-read", async (data) => {
      try {
        const { senderId } = data;

        // Mark messages as read
        await ChatMessage.updateMany(
          { sender: senderId, receiver: userId, read: false },
          { read: true }
        );

        // Notify sender if online
        const senderSocketId = userSockets.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages-read", { by: userId });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
      userSockets.delete(userId);
    });
  });
};
