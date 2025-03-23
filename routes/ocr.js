const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createWorker } = require("tesseract.js");
const fs = require("fs");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Middleware to ensure user is authenticated
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res
    .status(401)
    .json({ success: false, message: "Authentication required" });
};

// Route to perform OCR on prescription image
router.post(
  "/extract-text",
  isLoggedIn,
  upload.single("prescriptionImage"),
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Prescription image is required",
        });
      }

      const imagePath = req.file.path;

      // Perform OCR using Tesseract.js
      const worker = await createWorker();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");

      // Set additional parameters for better recognition of medical text
      await worker.setParameters({
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:()/-+=!? ",
        preserve_interword_spaces: "1",
      });

      const { data } = await worker.recognize(imagePath);
      await worker.terminate();

      // Clean up the uploaded file
      fs.unlinkSync(imagePath);

      // Process the extracted text to identify structured content
      const extractedText = data.text;

      // Basic structure extraction using regular expressions and string patterns
      const structuredContent = extractStructuredContent(extractedText);

      // Calculate confidence score (average of character confidences)
      const confidenceScore = data.confidence / 100; // Normalize to 0-1 range

      return res.status(200).json({
        extractedText: extractedText,
        structuredContent: structuredContent,
        confidenceScore: confidenceScore,
      });
    } catch (error) {
      console.error("OCR Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to extract text from prescription image",
        error: error.message,
      });
    }
  }
);

// Function to extract structured content from raw text
function extractStructuredContent(text) {
  if (!text || text.trim() === "") {
    return null;
  }

  // Split text into lines for processing
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  // Initialize structure
  const structure = {
    header: null,
    patientInfo: null,
    medicationList: [],
    doctorInfo: null,
    otherInstructions: null,
    date: null,
  };

  // Extract potential header (first 1-2 lines often contain clinic name)
  if (lines.length > 0) {
    structure.header = lines.slice(0, Math.min(2, lines.length)).join("\n");
  }

  // Look for patient information (typically contains "patient", "name", "age", "sex", "ID")
  const patientLines = lines.filter((line) =>
    /patient|name|age|sex|gender|dob|birth|id|mr\.?|mrs\.?|ms\.?/i.test(line)
  );

  if (patientLines.length > 0) {
    structure.patientInfo = patientLines.join("\n");
  }

  // Look for doctor information (typically contains "dr.", "doctor", "physician", etc.)
  const doctorLines = lines.filter((line) =>
    /dr\.?|doctor|physician|md|consultant|sign|signature/i.test(line)
  );

  if (doctorLines.length > 0) {
    structure.doctorInfo = doctorLines.join("\n");
  }

  // Look for date information
  const dateLines = lines.filter((line) =>
    /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
      line
    )
  );

  if (dateLines.length > 0) {
    structure.date = dateLines[0];
  }

  // Extract medication information
  // Typically medications have dosage information (mg, ml, tablet, capsule)
  // or administration instructions (daily, twice, times, hours)
  const medRegex =
    /\b\d+\s*(mg|ml|mcg|tablet|cap|capsule|pill|daily|twice|times|hours|morning|evening|night|bid|tid|qid)\b/i;

  let medicationLines = [];
  let currentMed = null;

  for (const line of lines) {
    if (medRegex.test(line)) {
      if (currentMed) {
        medicationLines.push(currentMed);
      }
      currentMed = line;
    } else if (currentMed && line.trim() !== "") {
      // Additional information for current medication
      currentMed += " " + line;
    }
  }

  if (currentMed) {
    medicationLines.push(currentMed);
  }

  // Convert medication lines to structured format
  for (const medLine of medicationLines) {
    const parts = medLine.split(/\s+/);
    if (parts.length >= 2) {
      const medName = parts.slice(0, Math.min(3, parts.length)).join(" ");
      const medDetails = medLine;

      structure.medicationList.push({
        name: medName,
        details: medDetails,
      });
    }
  }

  // Look for instructions (typically after medications, contains words like "take", "use", "apply")
  const instructionLines = lines.filter(
    (line) =>
      /take|use|apply|instructions|directions|caution|warning|avoid|note/i.test(
        line
      ) && !structure.medicationList.some((med) => med.details.includes(line))
  );

  if (instructionLines.length > 0) {
    structure.otherInstructions = instructionLines.join("\n");
  }

  return structure;
}

module.exports = router;
