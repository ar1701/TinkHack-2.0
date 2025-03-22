const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware to ensure user is authenticated
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res
    .status(401)
    .json({ success: false, message: "Authentication required" });
};

// Route to process chat messages with Gemini
router.post("/chat", isLoggedIn, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    // Get the Gemini model (using Gemini 2.0 Flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare chat context - add medical context and user information
    const userContext = `User is a ${req.user.userType} on a medical platform called MedConnect.`;
    const medicalContext =
      "This is a healthcare platform for patients, caregivers, and patient navigators. Responses should be helpful, accurate, and maintain medical privacy standards.";

    const formattingInstructions = `
    Please format your responses in a clean, structured way:
    1. For emphasis, use plain text instead of asterisks, or use HTML <strong> tags if needed
    2. For bullet points, use the format "* item" with a space after the asterisk
    3. For numbered lists, use the format "1. item" with a space after the number
    4. Separate paragraphs with a blank line
    5. Keep responses concise and well-organized
    `;

    // Prepare the prompt with context
    const prompt = `${medicalContext} ${userContext}\n\n${formattingInstructions}\n\nUser query: ${message}\n\nPlease provide a helpful response:`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      response: text,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process your request with Gemini",
      error: error.message,
    });
  }
});

module.exports = router;
