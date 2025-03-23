document.addEventListener("DOMContentLoaded", function () {
  // Initialize AOS animation library
  AOS.init();

  // Initialize document elements
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("prescriptionUpload");
  const prescriptionPreview = document.getElementById("prescriptionPreview");
  const prescriptionPreviewContainer = document.getElementById(
    "prescriptionPreviewContainer"
  );
  const analysisLoader = document.getElementById("analysisLoader");
  const analysisResult = document.getElementById("analysisResult");
  const extractedTextContent = document.getElementById("extractedTextContent");
  const structuredContent = document.getElementById("structuredContent");
  const saveAnalysisBtn = document.getElementById("saveAnalysisBtn");
  const shareWithDoctorBtn = document.getElementById("shareWithDoctorBtn");
  const backToFormBtn = document.getElementById("backToFormBtn");

  // Click on upload area to trigger file input
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Handle drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#4ecdc4";
    uploadArea.style.backgroundColor = "#f0f9ff";
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "#ccc";
    uploadArea.style.backgroundColor = "#f9f9f9";
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#ccc";
    uploadArea.style.backgroundColor = "#f9f9f9";

    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Handle file selection
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  // Handle file selection and upload
  function handleFile(file) {
    // Check if file is an image
    if (!file.type.match("image.*")) {
      alert("Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = function (e) {
      prescriptionPreview.src = e.target.result;
      prescriptionPreviewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);

    // Show loader, hide upload area
    uploadArea.style.display = "none";
    analysisLoader.style.display = "block";

    // Send to server for analysis
    uploadPrescriptionImage(file);
  }

  // Function to upload prescription image for analysis
  async function uploadPrescriptionImage(file) {
    try {
      // Create form data
      const formData = new FormData();
      formData.append("prescriptionImage", file);

      // Send to server
      const response = await fetch("/api/gemini/analyze-prescription", {
        method: "POST",
        body: formData,
      });

      // Parse response
      const result = await response.json();

      if (response.ok) {
        // Display results
        displayAnalysisResults(result);
      } else {
        throw new Error(result.message || "Failed to analyze prescription");
      }
    } catch (error) {
      console.error("Error analyzing prescription:", error);

      // Reset UI
      uploadArea.style.display = "block";
      analysisLoader.style.display = "none";

      // Show error message
      const errorMessage =
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
          ? "Network error: Please check your internet connection and try again."
          : `${error.message}. Please try with a clearer image or a different prescription.`;

      // Create error alert
      const errorAlert = document.createElement("div");
      errorAlert.className =
        "alert alert-danger alert-dismissible fade show mt-3";
      errorAlert.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${errorMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      // Insert before upload area
      uploadArea.parentNode.insertBefore(errorAlert, uploadArea);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        errorAlert.remove();
      }, 5000);
    }
  }

  // Function to display analysis results
  function displayAnalysisResults(analysis) {
    // Hide loader, show results
    analysisLoader.style.display = "none";
    analysisResult.style.display = "block";

    // Display extracted text (with pre-formatted style for readability)
    extractedTextContent.innerHTML = `
      <pre style="white-space: pre-wrap; font-family: inherit;">${
        analysis.extractedText || "No text could be extracted from the image."
      }</pre>
    `;

    // Display structured content
    let structuredHTML = "";

    if (analysis.structuredContent) {
      const content = analysis.structuredContent;

      // Header section
      if (content.header) {
        structuredHTML += `
          <div class="mb-3">
            <h6 class="border-bottom pb-2">Header/Clinic Information</h6>
            <p>${content.header}</p>
          </div>
        `;
      }

      // Patient information
      if (content.patientInfo) {
        structuredHTML += `
          <div class="mb-3">
            <h6 class="border-bottom pb-2">Patient Information</h6>
            <p>${content.patientInfo}</p>
          </div>
        `;
      }

      // Medication list
      if (content.medicationList && content.medicationList.length > 0) {
        structuredHTML += `<h6 class="border-bottom pb-2">Medications</h6>`;

        content.medicationList.forEach((med) => {
          structuredHTML += `
            <div class="card medication-card p-3 mb-3">
              <div class="d-flex align-items-center mb-2">
                <i class="fas fa-pills medicine-icon"></i>
                <strong>${med.name || "Medication"}</strong>
              </div>
              <p>${med.details || "No details available"}</p>
            </div>
          `;
        });
      }

      // Doctor information
      if (content.doctorInfo) {
        structuredHTML += `
          <div class="mb-3">
            <h6 class="border-bottom pb-2">Doctor Information</h6>
            <p>${content.doctorInfo}</p>
          </div>
        `;
      }

      // Other instructions
      if (content.otherInstructions) {
        structuredHTML += `
          <div class="mb-3">
            <h6 class="border-bottom pb-2">Instructions</h6>
            <p>${content.otherInstructions}</p>
          </div>
        `;
      }

      // Date information
      if (content.date) {
        structuredHTML += `
          <div class="mb-3">
            <h6 class="border-bottom pb-2">Date</h6>
            <p>${content.date}</p>
          </div>
        `;
      }
    } else {
      structuredHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          No structured content could be extracted. The text might be unclear or not formatted as a prescription.
        </div>
      `;
    }

    // Add confidence information if available
    if (analysis.confidenceScore !== undefined) {
      const confidencePct = Math.round(analysis.confidenceScore * 100);
      const confidenceLevel =
        confidencePct > 80 ? "High" : confidencePct > 60 ? "Medium" : "Low";

      structuredHTML += `
        <div class="alert alert-info mt-3">
          <i class="fas fa-info-circle me-2"></i>
          <strong>Extraction Confidence:</strong> ${confidencePct}% - ${confidenceLevel} confidence in these results.
          <p class="mb-0 mt-2">Always verify the extracted information with the original prescription.</p>
        </div>
      `;
    }

    structuredContent.innerHTML = structuredHTML;

    // Save the analysis to local history
    saveToHistory(analysis);
  }

  // Function to save analysis to history
  function saveToHistory(analysis) {
    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      extractedText: analysis.extractedText,
      structuredContent: analysis.structuredContent,
      confidenceScore: analysis.confidenceScore,
      // Store a thumbnail of the uploaded image if needed
      imageSrc: prescriptionPreview.src || null,
    };

    // Get existing history or initialize empty array
    let history = JSON.parse(
      localStorage.getItem("prescriptionHistory") || "[]"
    );

    // Add new item to history (limited to 10 entries)
    history.unshift(historyItem);
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    // Save back to localStorage
    localStorage.setItem("prescriptionHistory", JSON.stringify(history));

    // Update history UI if it exists on this page
    updateHistoryUI();
  }

  // Function to update history UI
  function updateHistoryUI() {
    const historyContainer = document.getElementById("analysisHistory");
    if (!historyContainer) return; // Exit if history container doesn't exist

    const history = JSON.parse(
      localStorage.getItem("prescriptionHistory") || "[]"
    );

    // Clear the history container
    historyContainer.innerHTML = "";

    if (history.length === 0) {
      historyContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          No prescription extraction history available.
        </div>
      `;
      return;
    }

    // Add each history item
    history.forEach((item, index) => {
      const historyCard = document.createElement("div");
      historyCard.className = "card mb-3 history-item";
      historyCard.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-2">
              <i class="fas fa-history text-primary me-2"></i>
              ${item.date}
            </h6>
            <button class="btn btn-sm btn-outline-primary load-history-btn" data-index="${index}">
              <i class="fas fa-eye me-1"></i> View
            </button>
          </div>
          <p class="card-text text-truncate">
            ${
              item.extractedText
                ? item.extractedText.substring(0, 100) + "..."
                : "No text available"
            }
          </p>
          ${
            item.confidenceScore !== undefined
              ? `<div class="text-muted small">
              <i class="fas fa-chart-line me-1"></i>
              Confidence: ${Math.round(item.confidenceScore * 100)}%
            </div>`
              : ""
          }
        </div>
      `;
      historyContainer.appendChild(historyCard);
    });

    // Add event listeners to load history buttons
    document.querySelectorAll(".load-history-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = this.getAttribute("data-index");
        loadHistoryItem(index);
      });
    });
  }

  // Function to load a history item
  function loadHistoryItem(index) {
    const history = JSON.parse(
      localStorage.getItem("prescriptionHistory") || "[]"
    );

    if (history.length > index) {
      const item = history[index];

      // Scroll to top of the page
      window.scrollTo(0, 0);

      // Hide the upload area and show the results section
      uploadArea.style.display = "none";
      analysisResult.style.display = "block";

      // Set the back button to be visible
      if (backToFormBtn) {
        backToFormBtn.style.display = "block";
      }

      // Display image if available
      if (item.imageSrc) {
        prescriptionPreview.src = item.imageSrc;
        prescriptionPreviewContainer.style.display = "block";
      }

      // Hide the loader
      analysisLoader.style.display = "none";

      // Display the results directly
      extractedTextContent.innerHTML = `
        <pre style="white-space: pre-wrap; font-family: inherit;">${
          item.extractedText || "No text could be extracted from the image."
        }</pre>
      `;

      // Generate structured content HTML
      let structuredHTML = "";

      if (item.structuredContent) {
        const content = item.structuredContent;

        // Same structured content generation as in displayAnalysisResults
        // Header section
        if (content.header) {
          structuredHTML += `
            <div class="mb-3">
              <h6 class="border-bottom pb-2">Header/Clinic Information</h6>
              <p>${content.header}</p>
            </div>
          `;
        }

        // Patient information
        if (content.patientInfo) {
          structuredHTML += `
            <div class="mb-3">
              <h6 class="border-bottom pb-2">Patient Information</h6>
              <p>${content.patientInfo}</p>
            </div>
          `;
        }

        // Medication list
        if (content.medicationList && content.medicationList.length > 0) {
          structuredHTML += `<h6 class="border-bottom pb-2">Medications</h6>`;

          content.medicationList.forEach((med) => {
            structuredHTML += `
              <div class="card medication-card p-3 mb-3">
                <div class="d-flex align-items-center mb-2">
                  <i class="fas fa-pills medicine-icon"></i>
                  <strong>${med.name || "Medication"}</strong>
                </div>
                <p>${med.details || "No details available"}</p>
              </div>
            `;
          });
        }

        // Doctor information
        if (content.doctorInfo) {
          structuredHTML += `
            <div class="mb-3">
              <h6 class="border-bottom pb-2">Doctor Information</h6>
              <p>${content.doctorInfo}</p>
            </div>
          `;
        }

        // Other instructions
        if (content.otherInstructions) {
          structuredHTML += `
            <div class="mb-3">
              <h6 class="border-bottom pb-2">Instructions</h6>
              <p>${content.otherInstructions}</p>
            </div>
          `;
        }

        // Date information
        if (content.date) {
          structuredHTML += `
            <div class="mb-3">
              <h6 class="border-bottom pb-2">Date</h6>
              <p>${content.date}</p>
            </div>
          `;
        }
      } else {
        structuredHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            No structured content available in the history item.
          </div>
        `;
      }

      // Add confidence information if available
      if (item.confidenceScore !== undefined) {
        const confidencePct = Math.round(item.confidenceScore * 100);
        const confidenceLevel =
          confidencePct > 80 ? "High" : confidencePct > 60 ? "Medium" : "Low";

        structuredHTML += `
          <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Extraction Confidence:</strong> ${confidencePct}% - ${confidenceLevel} confidence in these results.
            <p class="mb-0 mt-2 small">Always verify the extracted information with the original prescription.</p>
          </div>
        `;
      }

      structuredContent.innerHTML = structuredHTML;
    }
  }

  // Back button event handler
  if (backToFormBtn) {
    backToFormBtn.addEventListener("click", function () {
      // Hide results and show upload area
      analysisResult.style.display = "none";
      uploadArea.style.display = "block";

      // Clear the file input to allow new uploads
      fileInput.value = "";

      // Hide back button
      backToFormBtn.style.display = "none";
    });
  }

  // Save analysis button
  if (saveAnalysisBtn) {
    saveAnalysisBtn.addEventListener("click", async () => {
      try {
        // In a real implementation, this would save to the database
        // For now, we'll just show a success message
        alert("Prescription analysis saved to your medical records!");
      } catch (error) {
        console.error("Error saving analysis:", error);
        alert("An error occurred while saving the analysis. Please try again.");
      }
    });
  }

  // Share with doctor button
  if (shareWithDoctorBtn) {
    shareWithDoctorBtn.addEventListener("click", () => {
      // In a real implementation, this would open a modal to select a doctor to share with
      alert(
        "A sharing dialog would open here to select which doctor to share with."
      );
    });
  }

  // Initialize history UI
  updateHistoryUI();
});
