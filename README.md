# Arogyam

Arogyam is not just a platform—it’s a revolution in cancer care. By harnessing AI-driven medical intelligence, we dismantle barriers to treatment, transforming chaos into clarity for underprivileged patients. With cutting-edge medical record organization, intelligent patient navigation, and automated financial aid discovery, we empower patients with swift diagnoses, structured guidance, and unwavering support. Arogyam redefines healthcare accessibility, ensuring no patient is lost in complexity—because every life deserves a fighting chance.

-------

## Project Overview
Revolutionizing Cancer Care with AI-Powered Support
Cancer care is not just about treatment—it’s about access, guidance, and support. Many underprivileged patients struggle with treatment delays, disorganized medical records, financial burdens, and a lack of structured assistance, making their fight against cancer even harder.

Arogyam is an AI-driven healthcare platform designed to bridge these gaps, ensuring that every patient receives timely care, clear guidance, and financial aid without unnecessary delays. Our intelligent patient navigation system connects patients with certified navigators, social workers, and doctors, while our AI-powered medical record management (RAG technology) organizes unstructured data for instant, hassle-free access to patient history.

Beyond treatment, Arogyam provides emotional and community support, ensuring that no patient fights alone. With AI-driven financial aid discovery, real-time updates, and multilingual chatbot assistance, we are making cancer care more accessible, structured, and patient-centric—because healthcare should heal, not hinder.

-------

## Inspiration
Our inspiration for Arogyam comes from the countless stories of cancer patients lost in a maze of paperwork, long wait times, and inaccessible resources—barriers that often delay treatment and worsen outcomes. We saw the urgent need for a seamless, AI-powered solution that could bring clarity, guidance, and hope to those who need it most.

Cancer is a battle no one should fight alone, yet countless underprivileged patients face delays, confusion, and financial struggles that make treatment even harder. Many lose precious time—not to the disease, but to disorganized systems and inaccessible support.
Arogyam was born from a vision to change this. Inspired by the struggles of real patients, we are leveraging AI-driven solutions to bring clarity, speed, and guidance to those who need it most. By breaking down barriers in medical record management, patient navigation, and financial aid discovery, we ensure that healthcare becomes a right, not a privilege. Because in the fight against cancer, every second counts. 

--------

## Key Features:

### **🏥 AI-Powered Medical Record Management**
Navigating unstructured medical records is a nightmare for patients and caregivers. Our AI-driven Retrieval-Augmented Generation (RAG) system organizes and indexes medical reports, prescriptions, and diagnostics, enabling instant access to critical information. This eliminates delays, enhances treatment accuracy, and ensures patients receive the right care at the right time.

### **🤝 Intelligent Patient Navigator**
Cancer treatment is more than just medical procedures—it’s a complex journey. Our AI-powered patient navigator connects individuals with certified professionals—nurses, social workers, and survivors—who provide step-by-step guidance, appointment tracking, reminders, and personalized support. With multilingual chatbot & voice assistance, we break language barriers and ensure no patient feels lost or alone.

### **🔍 AI-Driven Treatment Insights**
Every second counts in cancer care. Our platform analyzes medical records and offers personalized treatment insights by cross-referencing global best practices. By leveraging AI, we help doctors and patients make informed decisions faster, leading to better outcomes and optimized care plans.

### **🌐 Seamless Doctor-Patient Connection**
Eliminating long hospital wait times, our platform creates a verified doctor network that enables direct teleconsultations, follow-ups, and real-time treatment tracking. Patients can access trusted professionals instantly, reducing treatment delays and ensuring continuity of care.

### **💬 AI-Powered Mental Health & Community Support**
Cancer is a battle fought on both physical and emotional fronts. Our AI-driven mental health check-ins provide early intervention and personalized well-being programs. Patients can join peer support groups, interact with counselors, and find strength in shared experiences—because healing goes beyond medicine.


------------


## Technology Stack

**Frontend 🎨**:
✅ EJS – Dynamic templating engine for rendering views.

✅ HTML, CSS, JavaScript – Core web technologies for structure, styling, and interactivity.

✅ Bootstrap 5 – Modern, responsive UI framework for styling.

**Backend ⚙️**:
✅ Node.js + Express.js – Scalable backend framework for APIs and server-side logic.

**Database & Storage 📂**:
✅ MongoDB Atlas – Cloud-based NoSQL database for efficient data management.

✅ Mongoose – ODM (Object Data Modeling) library for MongoDB.

✅ Cloudinary – Secure cloud storage for medical records and patient files.

**AI Integration 🤖**:
✅ Google Gemini 1.5 Flash – AI-powered health risk assessment and smart record search.

✅ GroqLLaMa – NLP model for processing and understanding patient queries.

✅ LangChain – AI workflow management for advanced decision-making and automation.

**Authentication & Security 🔐**:
✅ Passport.js – Secure authentication system for user login and session management.

**Deployment & Hosting 🚀**:
✅ Render – Cloud hosting for frontend, backend, and database services.

-------------

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
