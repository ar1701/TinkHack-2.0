const ChatMessage = require("../models/chatMessage");
const User = require("../models/user");
const NavigatorRequest = require("../models/navigatorRequest");

// Map to store user socket connections
const userSockets = new Map(); // userId -> socketId

module.exports = function (io) {
  // Store connected users
  const connectedUsers = new Map();

  // Socket middleware to authenticate users
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      console.log("Socket connection rejected: No user ID provided");
      socket.disconnect();
      return;
    }

    // Store user connection
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    try {
      // Get user from database
      const user = await User.findById(userId);

      if (!user) {
        console.log(
          `Socket connection rejected: User not found (ID: ${userId})`
        );
        socket.disconnect();
        return;
      }

      console.log(`User connected: ${user.fullName} (${userId})`);

      // Store user connection
      connectedUsers.set(userId, {
        socket: socket.id,
        user,
      });

      // Join a room with the user's ID to receive private messages
      socket.join(userId);

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${user.fullName} (${userId})`);
        connectedUsers.delete(userId);
      });

      // Handle private message
      socket.on("private-message", async (data) => {
        try {
          const { receiverId, message } = data;

          if (!receiverId || !message) {
            console.log("Invalid message data:", data);
            return;
          }

          // Create message in database
          const newMessage = new ChatMessage({
            sender: userId,
            receiver: receiverId,
            message: message,
            read: false,
          });

          await newMessage.save();

          // Emit the message to sender (for immediate feedback)
          io.to(userId).emit("new-message", {
            message: newMessage,
            sender: user,
          });

          // Emit to receiver if they are connected
          io.to(receiverId).emit("new-message", {
            message: newMessage,
            sender: user,
          });

          console.log(`Message sent from ${userId} to ${receiverId}`);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Error sending message" });
        }
      });

      // Handle typing indicator
      socket.on("typing", (data) => {
        const { receiverId, isTyping } = data;

        if (!receiverId) return;

        // Emit typing status to receiver
        io.to(receiverId).emit("user-typing", {
          userId,
          isTyping,
        });
      });

      // Handle marking messages as read
      socket.on("mark-read", async (data) => {
        try {
          const { senderId } = data;

          if (!senderId) return;

          // Update messages in database
          await ChatMessage.updateMany(
            { sender: senderId, receiver: userId, read: false },
            { read: true }
          );

          // Emit read status to sender
          io.to(senderId).emit("messages-read", {
            by: userId,
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });
    } catch (error) {
      console.error("Socket connection error:", error);
      socket.disconnect();
    }
  });

  return io;
};
