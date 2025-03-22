# Healthcare Platform

A comprehensive healthcare platform that connects patients with navigators and caregivers, facilitating medical record management and health risk assessments.

## Features

### Patient Features:

- **Dashboard**: View health risk assessment, upcoming appointments, and care team information
- **Medical Records**: Upload, view, update, and delete medical records
  - Filter by record type
  - Search functionality using AI-powered semantic search
- **Baseline Health Screening**: Complete comprehensive health assessment
  - AI-powered risk stratification using Google's Gemini 1.5 Flash
  - Analysis of medication history, personal health history, family history, and social determinants of health

### Navigator & Caregiver Features

- **Dashboard**: View assigned patients and relevant information

## Technology Stack:

- **Frontend**: HTML, CSS, JavaScript, EJS templating, Bootstrap 5
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js
- **File Storage**: Cloudinary for medical record file storage
- **AI Integration**: Google Gemini 1.5 Flash for health risk assessment and record search

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Cloudinary account
- Google AI API key for Gemini

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/healthcare-platform.git
   cd healthcare-platform
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Set up environment variables
   Copy `.env.example` to `.env` and fill in your details:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/healthcare
   SESSION_SECRET=your_session_secret

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the application

   ```
   npm start
   ```

5. Visit `http://localhost:3000` in your browser

## Project Structure

```
├── config/             # Configuration files
├── middleware/         # Express middleware
├── models/             # Mongoose models
├── public/             # Static assets
├── routes/             # Express routes
├── utils/              # Utility functions
├── views/              # EJS templates
│   ├── pages/          # Page templates
│   └── partials/       # Reusable template parts
├── .env                # Environment variables
├── app.js              # Application entry point
└── package.json        # Project metadata
```

## Key Features Explained

### Baseline Health Screening

The baseline screening feature collects comprehensive health information from patients including:

1. **Medication & Drug History**

   - Current medications
   - Medication allergies
   - Recreational drug use

2. **Personal Health History**

   - Chronic conditions
   - Past surgeries and hospitalizations
   - Mental health conditions

3. **Family Health History**

   - Predisposition to various conditions
   - Family medical background

4. **Social Determinants of Health (SDOH)**
   - Race/ethnicity
   - Education level
   - Housing situation
   - Healthcare access
   - Employment status
   - Food security
   - Transportation access
   - Social support network

This data is analyzed using Google's Gemini AI to provide a risk assessment categorizing patients into Low, Medium, or High risk levels, along with potential health concerns and recommendations.

### Medical Records Management

- **Upload**: Patients can upload various types of medical records with detailed metadata
- **Update/Delete**: Full CRUD functionality for managing records
- **Filter & Search**: AI-powered semantic search helps find relevant records
- **Security**: All records are securely stored and accessible only to authorized users

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for UI components
- Cloudinary for file storage
- Google for Gemini AI API
