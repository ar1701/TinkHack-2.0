// Gemini AI Chatbot implementation
document.addEventListener("DOMContentLoaded", function () {
  // Create chatbot UI elements
  const chatbotContainer = document.createElement("div");
  chatbotContainer.className = "chatbot-container";
  chatbotContainer.innerHTML = `
        <div class="chatbot-icon" id="chatbotIcon">
            <i class="fas fa-heartbeat"></i>
        </div>
        <div class="chatbot-panel" id="chatbotPanel">
            <div class="chatbot-header">
                <div class="header-content">
                    <i class="fas fa-heartbeat"></i>
                    <h5>Health Assistant</h5>
                </div>
                <button class="close-btn" id="closeChatbot"><i class="fas fa-times"></i></button>
            </div>
            <div class="chatbot-messages" id="chatbotMessages">
                <div class="message bot-message">
                    Hello! I'm your MedConnect Health Assistant powered by Gemini AI. I can answer your health-related questions and help you navigate the platform. How can I assist with your healthcare needs today?
                </div>
            </div>
            <div class="chatbot-input">
                <input type="text" id="userInput" placeholder="Ask a health question...">
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

    // Check if query is health-related
    if (isHealthRelated(lowerMessage)) {
      // Health-related responses
      if (
        lowerMessage.includes("appointment") ||
        lowerMessage.includes("schedule") ||
        lowerMessage.includes("doctor visit")
      ) {
        botResponse =
          "You can schedule a medical appointment from the Appointments section in the sidebar. Would you like me to help you find the right healthcare provider?";
      } else if (
        lowerMessage.includes("record") ||
        lowerMessage.includes("history") ||
        lowerMessage.includes("test") ||
        lowerMessage.includes("result")
      ) {
        botResponse =
          "Your medical records and test results can be accessed from the Medical Records section. This includes lab tests, imaging reports, and visit summaries from your healthcare providers.";
      } else if (
        lowerMessage.includes("doctor") ||
        lowerMessage.includes("specialist") ||
        lowerMessage.includes("physician") ||
        lowerMessage.includes("provider")
      ) {
        botResponse =
          "I can help you find the right medical specialist for your health needs. MedConnect partners with cardiologists, neurologists, oncologists, and many other specialists. Could you provide more details about your health concern?";
      } else if (
        lowerMessage.includes("symptom") ||
        lowerMessage.includes("pain") ||
        lowerMessage.includes("feeling") ||
        lowerMessage.includes("sick")
      ) {
        botResponse =
          "Based on your symptoms, it would be best to consult with a healthcare professional. While I can provide general health information, your doctor can provide personalized medical advice. Would you like to schedule an appointment?";
      } else if (
        lowerMessage.includes("medicine") ||
        lowerMessage.includes("medication") ||
        lowerMessage.includes("prescription") ||
        lowerMessage.includes("drug")
      ) {
        botResponse =
          "For medication-related questions, please consult with your healthcare provider or pharmacist. They can provide guidance on your prescriptions, potential side effects, and proper usage. Your medication history is available in your Medical Records section.";
      } else {
        botResponse =
          "I'm here to help with health-related questions and navigating the MedConnect platform. For specific medical advice, please consult with your healthcare provider through the Messages section.";
      }
    } else {
      // Response for non-health related queries
      botResponse =
        "I'm designed to help with health-related questions. Please ask me about medical conditions, wellness tips, healthcare services, or how to use the MedConnect platform.";
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

  // Function to check if the query is health-related
  function isHealthRelated(query) {
    const healthKeywords = [
      "health",
      "medical",
      "doctor",
      "hospital",
      "clinic",
      "appointment",
      "symptom",
      "disease",
      "condition",
      "treatment",
      "medicine",
      "drug",
      "prescription",
      "therapy",
      "surgery",
      "diagnosis",
      "checkup",
      "pain",
      "specialist",
      "emergency",
      "wellness",
      "vaccination",
      "immunization",
      "blood",
      "test",
      "screening",
      "cancer",
      "diabetes",
      "heart",
      "allergy",
      "vaccine",
      "covid",
      "virus",
      "infection",
      "injury",
      "recovery",
      "nurse",
      "physician",
      "dentist",
      "cardiology",
      "neurology",
      "pediatrics",
      "pharmacy",
      "mental health",
      "therapy",
      "diet",
      "nutrition",
      "exercise",
      "headache",
      "fever",
      "cough",
      "cold",
      "flu",
      "pressure",
      "stress",
      "anxiety",
      "depression",
      "insurance",
      "provider",
      "referral",
      "consultation",
      "prescription",
      "refill",
    ];

    return healthKeywords.some((keyword) => query.includes(keyword));
  }
});
