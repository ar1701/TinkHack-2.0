const express = require("express");
const router = express.Router();
const multer = require("multer");
const { generateEmbedding, searchRecords } = require("../utils/gemini");
const cloudinaryConfig = require("../config/cloudinary");
const { uploader } = cloudinaryConfig;
const MedicalRecord = require("../models/medicalRecord");
const { isLoggedIn } = require("../middleware/auth");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg, .jpeg and .pdf formats allowed!"));
    }
  },
});

// Get all records for the logged-in user
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id }).sort({
      recordDate: -1,
    });
    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medical records",
    });
  }
});

// Upload a new medical record
router.post("/upload", isLoggedIn, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { title, description, recordType, recordDate } = req.body;

    // Upload to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "medical_records",
    });

    let textContent = "";
    if (req.file.mimetype === "application/pdf") {
      // Extract text from PDF for RAG
      // This would use a PDF parsing library like pdf-parse
      // For simplicity, we're skipping this step
      textContent = description; // Use description as fallback
    } else {
      // For images, use the description as the text content
      textContent = description;
    }

    // Generate embedding for the text content
    const embedding = await generateEmbedding(textContent);

    // Create record in database
    const medicalRecord = new MedicalRecord({
      patient: req.user._id,
      title,
      description,
      recordType,
      recordDate,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      uploadDate: new Date(),
      textContent,
      vectorEmbedding: embedding,
    });

    await medicalRecord.save();

    res.status(201).json({
      success: true,
      message: "Medical record uploaded successfully",
      record: medicalRecord,
    });
  } catch (error) {
    console.error("Error uploading medical record:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading medical record",
    });
  }
});

// Search medical records
router.get("/search", isLoggedIn, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "No search query provided",
      });
    }

    const results = await searchRecords(query, req.user._id);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error searching records:", error);
    res.status(500).json({
      success: false,
      message: "Error searching medical records",
    });
  }
});

// Update a medical record
router.put("/:id", isLoggedIn, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, recordType, recordDate } = req.body;

    // Find the record and ensure it belongs to the user
    const record = await MedicalRecord.findOne({
      _id: id,
      patient: req.user._id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found or you don't have permission to edit it",
      });
    }

    // If new file uploaded, update file in Cloudinary
    if (req.file) {
      // Delete old file from Cloudinary
      if (record.cloudinaryPublicId) {
        await uploader.destroy(record.cloudinaryPublicId);
      }

      // Upload new file
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const result = await uploader.upload(dataURI, {
        resource_type: "auto",
        folder: "medical_records",
      });

      // Update record with new file info
      record.fileUrl = result.secure_url;
      record.cloudinaryPublicId = result.public_id;
    }

    // Update other fields
    record.title = title;
    record.description = description;
    record.recordType = recordType;
    record.recordDate = recordDate;

    // If description changed, update the embedding
    if (record.description !== description) {
      record.textContent = description;
      const newEmbedding = await generateEmbedding(description);
      record.vectorEmbedding = newEmbedding;
    }

    await record.save();

    res.json({
      success: true,
      message: "Medical record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Error updating medical record:", error);
    res.status(500).json({
      success: false,
      message: "Error updating medical record",
    });
  }
});

// Delete a medical record
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the record and ensure it belongs to the user
    const record = await MedicalRecord.findOne({
      _id: id,
      patient: req.user._id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found or you don't have permission to delete it",
      });
    }

    // Delete the file from Cloudinary
    await uploader.destroy(record.cloudinaryPublicId);

    // Delete the record
    await MedicalRecord.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "Medical record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting medical record:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting medical record",
    });
  }
});

module.exports = router;
