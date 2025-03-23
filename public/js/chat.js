// Chat functionality using Socket.io
class ChatManager {
  constructor(options) {
    this.userId = options.userId;
    this.userType = options.userType || "unknown";
    this.socket = null;
    this.currentChatPartnerId = null;
    this.typingTimeout = null;
    this.isConnected = false;
    this.onMessageReceived = options.onMessageReceived || null;
    this.onTypingStarted = options.onTypingStarted || null;
    this.onTypingStopped = options.onTypingStopped || null;

    // Initialize socket connection once userId is set
    if (this.userId) {
      this.connect();
    }
  }

  // Connect to Socket.io server
  connect() {
    if (!this.userId) {
      console.error("Cannot connect: User ID not set");
      return;
    }

    try {
      this.socket = io({
        auth: {
          userId: this.userId,
        },
      });

      // Connection events
      this.socket.on("connect", () => {
        console.log("Connected to chat server");
        this.isConnected = true;
        document.dispatchEvent(new CustomEvent("chat:connected"));
      });

      this.socket.on("disconnect", () => {
        console.log("Disconnected from chat server");
        this.isConnected = false;
        document.dispatchEvent(new CustomEvent("chat:disconnected"));
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        document.dispatchEvent(
          new CustomEvent("chat:error", {
            detail: { message: "Could not connect to chat server" },
          })
        );
      });

      // Chat messages events
      this.socket.on("new-message", (data) => {
        console.log("New message received:", data);

        // Determine if message is outgoing (sent by current user)
        // Either use the flag provided by server or check sender ID
        const isOutgoing = data.isSenderView || data.sender._id === this.userId;

        // If we have a callback, use it
        if (
          this.onMessageReceived &&
          typeof this.onMessageReceived === "function"
        ) {
          this.onMessageReceived(
            {
              content: data.message.message,
              timestamp: data.message.createdAt,
              sender: data.sender._id,
            },
            isOutgoing
          );
        }

        document.dispatchEvent(
          new CustomEvent("chat:newMessage", {
            detail: { ...data, isOutgoing },
          })
        );

        // If message is from current chat partner and not from self, mark as read
        if (!isOutgoing && this.currentChatPartnerId === data.sender._id) {
          this.markMessagesAsRead(data.sender._id);
        }
      });

      // Typing indicators
      this.socket.on("user-typing", (data) => {
        console.log("User typing:", data);

        if (data.isTyping && this.onTypingStarted) {
          this.onTypingStarted(data.userId);
        } else if (!data.isTyping && this.onTypingStopped) {
          this.onTypingStopped(data.userId);
        }

        document.dispatchEvent(
          new CustomEvent("chat:typing", { detail: data })
        );
      });

      // Error handling
      this.socket.on("error", (error) => {
        console.error("Socket error:", error);
        document.dispatchEvent(
          new CustomEvent("chat:error", { detail: error })
        );
      });
    } catch (error) {
      console.error("Error initializing socket:", error);
    }
  }

  // Load chat history with a specific user
  loadChatHistory(partnerId) {
    if (!partnerId) return;

    this.currentChatPartnerId = partnerId;

    // Mark messages as read
    this.markMessagesAsRead(partnerId);

    // Fetch chat history from API
    fetch(`/api/chat/${partnerId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Process messages
          const chatMessages = document.getElementById("chatMessages");
          const loadingIndicator = document.getElementById("loadingMessages");

          if (loadingIndicator) {
            loadingIndicator.remove(); // Remove loading indicator completely
          }

          if (chatMessages) {
            // Clear existing messages
            chatMessages.innerHTML = "";

            // Add messages to chat
            data.messages.forEach((msg) => {
              // Determine if this is a sent or received message
              const isOutgoing = msg.sender.toString() === this.userId;

              if (this.onMessageReceived) {
                this.onMessageReceived(
                  {
                    content: msg.message,
                    timestamp: msg.createdAt,
                    sender: msg.sender,
                  },
                  isOutgoing
                );
              } else {
                // Fallback implementation
                const msgElement = document.createElement("div");
                msgElement.className = `message ${
                  isOutgoing ? "outgoing" : "incoming"
                }`;
                msgElement.innerHTML = `
                  <div class="message-content">
                    <div class="message-text">${msg.message}</div>
                    <div class="message-time">${new Date(
                      msg.createdAt
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</div>
                  </div>
                `;
                chatMessages.appendChild(msgElement);
              }
            });

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } else {
          // Handle no messages or error
          const chatMessages = document.getElementById("chatMessages");
          if (chatMessages) {
            chatMessages.innerHTML = `
              <div class="text-center p-3">
                <p class="text-muted">No messages yet. Start a conversation!</p>
              </div>
            `;
          }
        }
      })
      .catch((error) => {
        console.error("Error loading chat history:", error);
        // Remove loading indicator and show error
        const chatMessages = document.getElementById("chatMessages");
        if (chatMessages) {
          chatMessages.innerHTML = `
            <div class="alert alert-danger m-3">Error loading messages. Please try again.</div>
          `;
        }
      });
  }

  // Send a message to another user
  sendMessage(receiverId, message) {
    if (!this.socket || !this.isConnected) {
      console.error("Cannot send message: Not connected");
      return false;
    }

    // Add new message to UI immediately for better user experience
    const chatContainer = document.getElementById("chatMessages");
    if (chatContainer) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "message outgoing";
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-text">${message}</div>
          <div class="message-time">${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}</div>
        </div>
      `;
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    this.socket.emit("private-message", {
      receiverId,
      message,
    });

    return true;
  }

  // Set current chat partner and mark messages as read
  setChatPartner(userId) {
    this.currentChatPartnerId = userId;

    if (userId) {
      this.markMessagesAsRead(userId);
    }
  }

  // Mark messages from a sender as read
  markMessagesAsRead(senderId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit("mark-read", {
      senderId,
    });
  }

  // Send typing indicator
  sendTypingStatus(receiverId, isTyping = true) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    // Send typing indicator
    this.socket.emit("typing", {
      receiverId,
      isTyping,
    });
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Initialize chat when DOM is loaded
let chatManager = null;

function initializeChat(options) {
  // Create chat manager with options
  chatManager = new ChatManager(options);
  window.chatManager = chatManager;

  console.log("Chat initialized with user ID:", options.userId);
}

function setupChatEventListeners() {
  // Example chat message input field
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("input", function () {
      const receiverId = document.getElementById("chatReceiverId")?.value;
      if (receiverId && chatManager) {
        chatManager.sendTypingStatus(receiverId);
      }
    });
  }

  // Example send message button
  const sendButton = document.getElementById("sendMessage");
  if (sendButton) {
    sendButton.addEventListener("click", function () {
      const messageInput = document.getElementById("messageInput");
      const receiverId = document.getElementById("chatReceiverId")?.value;

      if (receiverId && messageInput?.value.trim() && chatManager) {
        chatManager.sendMessage(receiverId, messageInput.value.trim());
        messageInput.value = "";
      }
    });
  }

  // Listen for new messages
  document.addEventListener("chat:newMessage", function (event) {
    const data = event.detail;
    console.log("New message event:", data);

    // Check if message is already displayed by the optimistic UI update in sendMessage
    if (
      data.isOutgoing &&
      document.querySelector(".message.outgoing:last-child")
    ) {
      const lastMessage = document.querySelector(
        ".message.outgoing:last-child"
      );
      const messageText = lastMessage.querySelector(".message-text");

      // If the last outgoing message contains the same text, don't add a duplicate
      if (messageText && messageText.textContent === data.message.message) {
        console.log("Skipping duplicate outgoing message display");
        return;
      }
    }

    // Update UI with new message
    const chatContainer = document.getElementById("chatMessages");
    if (chatContainer) {
      appendNewMessage(chatContainer, data.message, data.isOutgoing);
    }

    // Show notification if needed
    if (document.hidden && !data.isOutgoing) {
      showNotification(data.sender.fullName, data.message.message);
    }
  });

  // Handle typing indicators
  document.addEventListener("chat:typing", function (event) {
    const data = event.detail;
    const typingIndicator = document.getElementById("typingIndicator");

    if (typingIndicator) {
      if (data.isTyping) {
        typingIndicator.style.display = "block";
      } else {
        typingIndicator.style.display = "none";
      }
    }
  });
}

// Helper function to append a new message to the chat
function appendNewMessage(container, message, isOutgoing) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isOutgoing ? "message outgoing" : "message incoming";

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-text">${message.message}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// Show browser notification for new message
function showNotification(senderName, messageContent) {
  // Check if the browser supports notifications
  if (!("Notification" in window)) {
    return;
  }

  // Check if permission is already granted
  if (Notification.permission === "granted") {
    createNotification(senderName, messageContent);
  }
  // Otherwise, request permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        createNotification(senderName, messageContent);
      }
    });
  }
}

function createNotification(title, body) {
  const notification = new Notification(title, {
    body: body,
    icon: "/favicon.ico",
  });

  notification.onclick = function () {
    window.focus();
    notification.close();
  };

  // Auto close after 5 seconds
  setTimeout(notification.close.bind(notification), 5000);
}

// Export the chat initializer
window.initializeChat = initializeChat;
