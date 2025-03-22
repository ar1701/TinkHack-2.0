// Gemini AI Chatbot implementation
document.addEventListener("DOMContentLoaded", function () {
  // Create chatbot UI elements
  const chatbotContainer = document.createElement("div");
  chatbotContainer.className = "chatbot-container";
  chatbotContainer.innerHTML = `
        <div class="chatbot-icon" id="chatbotIcon">
            <i class="fas fa-robot"></i>
        </div>
        <div class="chatbot-panel" id="chatbotPanel">
            <div class="chatbot-header">
                <h5>MedConnect Assistant</h5>
                <button class="close-btn" id="closeChatbot"><i class="fas fa-times"></i></button>
            </div>
            <div class="chatbot-messages" id="chatbotMessages">
                <div class="message bot-message">
                    Hello! I'm your MedConnect assistant powered by Gemini AI. How can I help you today?
                </div>
            </div>
            <div class="chatbot-input">
                <input type="text" id="userInput" placeholder="Type your message...">
                <button id="sendMessage"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

  document.body.appendChild(chatbotContainer);

  // Add event listeners
  const chatbotIcon = document.getElementById("chatbotIcon");
  const chatbotPanel = document.getElementById("chatbotPanel");
  const closeChatbot = document.getElementById("closeChatbot");
  const userInput = document.getElementById("userInput");
  const sendMessage = document.getElementById("sendMessage");
  const chatbotMessages = document.getElementById("chatbotMessages");

  // Toggle chatbot panel
  chatbotIcon.addEventListener("click", function () {
    chatbotPanel.classList.toggle("active");
  });

  // Close chatbot panel
  closeChatbot.addEventListener("click", function () {
    chatbotPanel.classList.remove("active");
  });

  // Send message function
  function sendUserMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    // Add user message to chat
    addMessage(message, "user");
    userInput.value = "";

    // Show typing indicator
    showTypingIndicator();

    // Call Gemini API through our backend
    processWithGemini(message);
  }

  // Send message on button click
  sendMessage.addEventListener("click", sendUserMessage);

  // Send message on Enter key
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendUserMessage();
    }
  });

  // Format response text to handle markdown-like syntax
  function formatResponse(text) {
    // Replace numbered lists (e.g., "1. text")
    text = text.replace(
      /(\d+)\.\s+([^\n]+)/g,
      '<div class="list-item"><span class="list-number">$1.</span> $2</div>'
    );

    // Replace asterisk bullet points with proper HTML bullets
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(
      /\*\s+([^\n]+)/g,
      '<div class="list-item"><span class="bullet-point">•</span> $1</div>'
    );

    // Handle paragraphs
    let paragraphs = text.split("\n\n");
    paragraphs = paragraphs.map((p) => {
      if (p.trim().length > 0 && !p.includes('<div class="list-item">')) {
        return `<p>${p}</p>`;
      }
      return p;
    });

    return paragraphs.join("");
  }

  // Add message to chat
  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    if (sender === "bot") {
      // Format bot responses
      messageDiv.innerHTML = formatResponse(text);
    } else {
      messageDiv.textContent = text;
    }

    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  // Show typing indicator
  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot-message typing-indicator";
    typingDiv.innerHTML = "<span></span><span></span><span></span>";
    typingDiv.id = "typingIndicator";
    chatbotMessages.appendChild(typingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  // Remove typing indicator
  function removeTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // Process message with Gemini through our backend API
  async function processWithGemini(message) {
    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.success) {
        // Add bot response to chat
        addMessage(data.response, "bot");
      } else {
        // Show error message
        addMessage(
          "Sorry, I couldn't process your request. Please try again later.",
          "bot"
        );
        console.error("Gemini API error:", data.message);
      }
    } catch (error) {
      removeTypingIndicator();
      addMessage(
        "Sorry, I couldn't connect to the server. Please try again later.",
        "bot"
      );
      console.error("API call error:", error);

      // Fallback to local responses if API fails
      fallbackResponse(message);
    }
  }

  // Fallback function for when API fails
  function fallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    let botResponse = "";

    if (
      lowerMessage.includes("appointment") ||
      lowerMessage.includes("schedule")
    ) {
      botResponse =
        "You can schedule an appointment from the Appointments section in the sidebar. Would you like me to help you with that?";
    } else if (
      lowerMessage.includes("record") ||
      lowerMessage.includes("history")
    ) {
      botResponse =
        "Your medical records can be accessed from the Medical Records section. Is there something specific you're looking for?";
    } else if (
      lowerMessage.includes("doctor") ||
      lowerMessage.includes("specialist")
    ) {
      botResponse =
        "I can help you find the right specialist for your needs. Could you provide more details about what you're looking for?";
    } else if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("assistant")
    ) {
      botResponse =
        "I'm here to help you navigate MedConnect. You can ask me about appointments, medical records, finding specialists, or any other features of the platform.";
    } else {
      botResponse =
        "Thank you for your message. For more specific assistance, please reach out to your patient navigator or healthcare provider through the Messages section.";
    }

    // Only add this response if we haven't already added a bot message (to prevent duplicates)
    const lastMessage = chatbotMessages.lastElementChild;
    if (
      !lastMessage ||
      !lastMessage.classList.contains("bot-message") ||
      lastMessage.classList.contains("typing-indicator")
    ) {
      addMessage(botResponse, "bot");
    }
  }
});
