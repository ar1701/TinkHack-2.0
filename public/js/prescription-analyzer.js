/**
 * Prescription Analyzer
 * Handles client-side functionality for prescription text extraction and analysis
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize elements
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
  const loaderText = document.getElementById("loaderText");
  const methodSelectors = document.querySelectorAll(
    'input[name="extractionMethod"]'
  );

  // Set up method selection change handler
  methodSelectors.forEach((selector) => {
    selector.addEventListener("change", function () {
      updateMethodDescription();
    });
  });

  // Update method description based on selected method
  function updateMethodDescription() {
    const method = document.querySelector(
      'input[name="extractionMethod"]:checked'
    ).value;
    const methodDescription = document.getElementById("methodDescription");

    if (methodDescription) {
      if (method === "gemini") {
        methodDescription.innerHTML = `
          <i class="fas fa-info-circle"></i> 
          Google's Gemini AI provides advanced text recognition with context understanding.
          <span class="badge bg-primary">Cloud-based</span>
        `;
      } else {
        methodDescription.innerHTML = `
          <i class="fas fa-info-circle"></i> 
          Tesseract OCR processes your prescription locally for enhanced privacy.
          <span class="badge bg-success">On-device</span>
        `;
      }
    }
  }

  // Initialize method description
  updateMethodDescription();

  // Handle file upload
  fileInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Maximum size is 5MB.");
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function (event) {
        prescriptionPreview.src = event.target.result;
        prescriptionPreviewContainer.style.display = "block";
      };
      reader.readAsDataURL(file);

      // Process file
      processPrescriptionImage(file);
    }
  });

  // Handle file drop
  uploadArea.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadArea.classList.add("bg-light");
  });

  uploadArea.addEventListener("dragleave", function () {
    uploadArea.classList.remove("bg-light");
  });

  uploadArea.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadArea.classList.remove("bg-light");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      const event = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(event);
    }
  });

  uploadArea.addEventListener("click", function () {
    fileInput.click();
  });

  // Process the prescription image
  async function processPrescriptionImage(file) {
    // Get selected method
    const method = document.querySelector(
      'input[name="extractionMethod"]:checked'
    ).value;

    // Update loader text based on method
    if (method === "gemini") {
      loaderText.textContent = "Analyzing your prescription with Gemini AI...";
    } else {
      loaderText.textContent =
        "Extracting text with Tesseract OCR (processing locally)...";
    }

    // Show the loader, hide the form
    analysisInProgress();

    try {
      // Create form data
      const formData = new FormData();
      formData.append("prescriptionImage", file);

      // Determine which API endpoint to use
      const apiEndpoint =
        method === "gemini"
          ? "/api/gemini/analyze-prescription"
          : "/api/ocr/extract-text";

      // Send to server
      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();

      // Check if result is successful
      if (result.success !== false) {
        // Display results
        showResults(result, file);
      } else {
        throw new Error(result.message || "Failed to analyze prescription");
      }
    } catch (error) {
      console.error("Error during prescription analysis:", error);

      // Determine error message based on method
      let errorMessage = "";
      if (method === "gemini") {
        if (
          error.message.includes("network") ||
          error.message.includes("timeout")
        ) {
          errorMessage =
            "Network error while connecting to Gemini API. Please check your internet connection and try again.";
        } else {
          errorMessage =
            "Error analyzing prescription with Gemini AI. The image may be unclear or contain unrecognizable text.";
        }
      } else {
        errorMessage =
          "Error extracting text with Tesseract OCR. The image may be unclear or have insufficient contrast.";
      }

      analysisError(errorMessage);
    }
  }

  // Function to display results
  function showResults(result, file) {
    // Hide loader
    analysisLoader.style.display = "none";

    // Show results section
    analysisResult.style.display = "block";

    // Display extracted text (with pre-formatted style for readability)
    extractedTextContent.innerHTML = `
      <pre style="white-space: pre-wrap; font-family: inherit;">${
        result.extractedText || "No text could be extracted from the image."
      }</pre>
    `;

    // Generate and display structured content HTML
    let structuredHTML = "";

    if (result.structuredContent) {
      const content = result.structuredContent;

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
    if (result.confidenceScore !== undefined) {
      const confidencePct = Math.round(result.confidenceScore * 100);
      const confidenceClass =
        confidencePct > 80
          ? "success"
          : confidencePct > 60
          ? "warning"
          : "danger";
      const confidenceLevel =
        confidencePct > 80 ? "High" : confidencePct > 60 ? "Medium" : "Low";

      structuredHTML += `
        <div class="alert alert-${confidenceClass} mt-3">
          <i class="fas fa-info-circle me-2"></i>
          <strong>Extraction Confidence:</strong> ${confidencePct}% - ${confidenceLevel} confidence in these results.
          <p class="mb-0 mt-2 small">Always verify the extracted information with the original prescription.</p>
        </div>
      `;
    }

    structuredContent.innerHTML = structuredHTML;

    // Save the analysis to local history
    saveToHistory(result, file);
  }

  // Function to save analysis to history
  function saveToHistory(analysis, file) {
    const method = document.querySelector(
      'input[name="extractionMethod"]:checked'
    ).value;

    const historyItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      extractedText: analysis.extractedText,
      structuredContent: analysis.structuredContent,
      confidenceScore: analysis.confidenceScore,
      method: method, // Save which method was used
      imageSrc: file ? URL.createObjectURL(file) : null,
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

    // Update history UI
    updateHistoryUI();
  }

  // Function to update history UI
  function updateHistoryUI() {
    const historyContainer = document.getElementById("analysisHistory");
    if (!historyContainer) return;

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
      const date = new Date(item.date);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const methodBadge =
        item.method === "gemini"
          ? '<span class="badge bg-primary">Gemini AI</span>'
          : '<span class="badge bg-success">Tesseract OCR</span>';

      const historyCard = document.createElement("div");
      historyCard.className = "card mb-3 history-item";
      historyCard.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-2">
              <i class="fas fa-history text-primary me-2"></i>
              ${formattedDate}
            </h6>
            <button class="btn btn-sm btn-outline-primary load-history-btn" data-index="${index}">
              <i class="fas fa-eye me-1"></i> View
            </button>
          </div>
          <p class="card-text text-truncate">
            ${
              item.extractedText
                ? item.extractedText.substring(0, 50) + "..."
                : "No text available"
            }
          </p>
          <div class="d-flex justify-content-between align-items-center">
            ${methodBadge}
            ${
              item.confidenceScore !== undefined
                ? `<div class="text-muted small">
                <i class="fas fa-chart-line me-1"></i>
                Confidence: ${Math.round(item.confidenceScore * 100)}%
              </div>`
                : ""
            }
          </div>
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

      // Show the results section
      analysisResult.style.display = "block";
      uploadArea.style.display = "none";

      // Display image if available
      if (item.imageSrc) {
        prescriptionPreview.src = item.imageSrc;
        prescriptionPreviewContainer.style.display = "block";
      }

      // Hide the loader
      analysisLoader.style.display = "none";

      // Display the extracted text
      extractedTextContent.innerHTML = `
        <pre style="white-space: pre-wrap; font-family: inherit;">${
          item.extractedText || "No text could be extracted from the image."
        }</pre>
      `;

      // Generate structured content HTML
      let structuredHTML = "";

      if (item.structuredContent) {
        const content = item.structuredContent;

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
        const confidenceClass =
          confidencePct > 80
            ? "success"
            : confidencePct > 60
            ? "warning"
            : "danger";
        const confidenceLevel =
          confidencePct > 80 ? "High" : confidencePct > 60 ? "Medium" : "Low";

        structuredHTML += `
          <div class="alert alert-${confidenceClass} mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Extraction Confidence:</strong> ${confidencePct}% - ${confidenceLevel} confidence in these results.
            <p class="mb-0 mt-2 small">Always verify the extracted information with the original prescription.</p>
          </div>
        `;
      }

      // Display method used
      structuredHTML += `
        <div class="text-center mt-2">
          <span class="badge ${
            item.method === "gemini" ? "bg-primary" : "bg-success"
          } p-2">
            <i class="fas ${
              item.method === "gemini" ? "fa-robot" : "fa-desktop"
            } me-1"></i>
            Processed with ${
              item.method === "gemini" ? "Gemini AI" : "Tesseract OCR"
            }
          </span>
        </div>
      `;

      structuredContent.innerHTML = structuredHTML;
    }
  }

  // Function to handle the analysis in progress
  function analysisInProgress() {
    uploadArea.style.display = "none";
    analysisLoader.style.display = "block";
    analysisResult.style.display = "none";
  }

  // Function to handle errors
  function analysisError(message) {
    analysisLoader.style.display = "none";
    uploadArea.style.display = "block";

    // Show error alert
    const errorAlert = document.createElement("div");
    errorAlert.className =
      "alert alert-danger alert-dismissible fade show mt-3";
    errorAlert.innerHTML = `
      <i class="fas fa-exclamation-circle me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Insert before the form
    uploadArea.parentNode.insertBefore(errorAlert, uploadArea);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      errorAlert.remove();
    }, 5000);
  }

  // Handle back button click
  if (backToFormBtn) {
    backToFormBtn.addEventListener("click", function () {
      // Hide results and show form
      analysisResult.style.display = "none";
      uploadArea.style.display = "block";

      // Clear the file input to allow new uploads
      fileInput.value = "";
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

  // Initialize the history UI
  updateHistoryUI();
});
