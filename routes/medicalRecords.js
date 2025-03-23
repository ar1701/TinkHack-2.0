const express = require("express");
const router = express.Router();
const multer = require("multer");
const { generateEmbedding, searchRecords } = require("../utils/gemini");
const cloudinaryConfig = require("../config/cloudinary");
const { uploader } = cloudinaryConfig;
const MedicalRecord = require("../models/medicalRecord");
const { isLoggedIn } = require("../middleware/auth");
const axios = require("axios");
const FormData = require("form-data");

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
router.post("/upload", isLoggedIn, async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.files.file;
    const { title, description, recordType, recordDate } = req.body;

    // Validate required fields
    if (!title || !description || !recordType || !recordDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (title, description, recordType, or recordDate)",
      });
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File too large (max 10MB)",
      });
    }

    // Validate file type
    const validTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "application/pdf",
    ];
    if (!validTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file type. Only .png, .jpg, .jpeg and .pdf formats allowed!",
      });
    }

    // Upload to Cloudinary using the temp file path
    const result = await uploader.upload(file.tempFilePath, {
      resource_type: "auto",
      folder: "medical_records",
    });

    // Create record in MongoDB
    const medicalRecord = new MedicalRecord({
      patient: req.user._id,
      title,
      description,
      recordType,
      recordDate,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      uploadDate: new Date(),
    });

    await medicalRecord.save();

    // Cleanup temp file
    const fs = require("fs");
    fs.unlink(file.tempFilePath, (err) => {
      if (err) console.error("Failed to clean up temp file:", err);
    });

    // Process record with Python server for RAG (optional)
    try {
      if (process.env.ENABLE_RAG === "true") {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(file.tempFilePath), {
          filename: file.name,
          contentType: file.mimetype,
        });

        formData.append(
          "record_data",
          JSON.stringify({
            recordId: medicalRecord._id.toString(),
            userId: req.user._id.toString(),
            title,
            description,
            recordType,
            recordDate,
          })
        );

        const pythonResponse = await axios.post(
          "https://groclake-rag.onrender.com/process_record",
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 30000, // 30 second timeout
          }
        );

        if (pythonResponse.data.success) {
          // Update record with text content and summary
          medicalRecord.textContent =
            pythonResponse.data.text_length.toString();
          medicalRecord.metadata = new Map([
            ["chunks_count", pythonResponse.data.chunks_count.toString()],
            ["summary", pythonResponse.data.summary],
            [
              "vector_ids",
              JSON.stringify(pythonResponse.data.vector_ids || []),
            ],
          ]);
          await medicalRecord.save();
        }
      }
    } catch (ragError) {
      console.error("Warning: RAG processing error:", ragError.message);
      // Continue even if RAG processing fails - record is still saved
    }

    res.status(201).json({
      success: true,
      message: "Medical record uploaded successfully",
      record: medicalRecord,
    });
  } catch (error) {
    console.error("Error uploading medical record:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading medical record: " + error.message,
    });
  }
});

// Query medical records
router.post("/query", isLoggedIn, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    // Call Python server for RAG
    try {
      const response = await axios.post(
        "https://groclake-rag.onrender.com/query_records",
        {
          question,
          userId: req.user._id.toString(),
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error("Error from RAG server:", error.message);
      res.status(500).json({
        success: false,
        message: "Error processing your question",
      });
    }
  } catch (error) {
    console.error("Error querying records:", error);
    res.status(500).json({
      success: false,
      message: "Error processing your question",
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
        message: "Search query is required",
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

// Get a specific record
router.get("/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findOne({
      _id: id,
      patient: req.user._id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found or you don't have permission to view it",
      });
    }

    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Error fetching record:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medical record",
    });
  }
});

// Update a medical record
router.put("/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, recordType, recordDate } = req.body;

    // Validate required fields
    if (!title || !description || !recordType || !recordDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (title, description, recordType, or recordDate)",
      });
    }

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
    if (req.files && req.files.file) {
      try {
        const file = req.files.file;

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "File too large (max 10MB)",
          });
        }

        // Delete old file from Cloudinary if it exists
        if (record.cloudinaryPublicId) {
          await uploader.destroy(record.cloudinaryPublicId);
        }

        // Upload new file to Cloudinary
        const result = await uploader.upload(file.tempFilePath, {
          resource_type: "auto",
          folder: "medical_records",
        });

        // Update record with new file info
        record.fileUrl = result.secure_url;
        record.cloudinaryPublicId = result.public_id;

        // Cleanup temp file
        const fs = require("fs");
        fs.unlink(file.tempFilePath, (err) => {
          if (err) console.error("Failed to clean up temp file:", err);
        });

        // Process new file with RAG server only if enabled
        try {
          if (process.env.ENABLE_RAG === "true") {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(file.tempFilePath), {
              filename: file.name,
              contentType: file.mimetype,
            });

            const recordData = {
              recordId: record._id.toString(),
              userId: req.user._id.toString(),
              title,
              description,
              recordType,
              recordDate,
            };

            formData.append("record_data", JSON.stringify(recordData));

            const pythonResponse = await axios.post(
              "https://groclake-rag.onrender.com/process_record",
              formData,
              {
                headers: formData.getHeaders(),
                timeout: 30000, // 30 second timeout
              }
            );

            if (pythonResponse.data.success) {
              // Update record with text content and summary
              record.textContent = pythonResponse.data.text_length.toString();
              record.metadata = new Map([
                ["chunks_count", pythonResponse.data.chunks_count.toString()],
                ["summary", pythonResponse.data.summary],
                [
                  "vector_ids",
                  JSON.stringify(pythonResponse.data.vector_ids || []),
                ],
              ]);
            }
          }
        } catch (ragError) {
          console.error(
            "Warning: RAG processing error during update:",
            ragError.message
          );
          // Continue even if RAG processing fails
        }
      } catch (fileError) {
        console.error("Error processing file:", fileError);
        return res.status(500).json({
          success: false,
          message: "Error processing the uploaded file: " + fileError.message,
        });
      }
    }

    // Update other fields
    record.title = title;
    record.description = description;
    record.recordType = recordType;
    record.recordDate = recordDate;

    await record.save();

    res.json({
      success: true,
      message: "Medical record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Error updating medical record:", error);
    // Log details about the request for debugging
    console.log("Request body fields:", Object.keys(req.body));
    console.log(
      "Request files:",
      req.files ? Object.keys(req.files) : "No files"
    );

    res.status(500).json({
      success: false,
      message: "Error updating medical record: " + error.message,
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
