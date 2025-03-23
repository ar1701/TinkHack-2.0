if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const User = require("./models/user");
const medicalRecordsRoutes = require("./routes/medicalRecords");
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const navigatorRoutes = require("./routes/navigator");
const caregiverRoutes = require("./routes/caregiver");
const baselineScreeningRoutes = require("./routes/baselineScreening");
const geminiRoutes = require("./routes/gemini");
const navigatorListRoutes = require("./routes/navigatorList");
const chatRoutes = require("./routes/chat");
const fileUpload = require("express-fileupload");
const http = require("http");
const socketIO = require("socket.io");
const carePlansRouter = require("./routes/carePlans");

var app = express();

const ATLASDB_URL = process.env.ATLASDB_URL;

// Connect to MongoDB
mongoose
  .connect(ATLASDB_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Configure middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Configure file upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
    createParentPath: true, // Create upload directory if it doesn't exist
  })
);

// Configure session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "our little secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport-Local Strategy
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

app.get("/login", (req, res) => {
  res.render("pages/auth/login.ejs");
});

app.post("/login", (req, res, next) => {
  const { username, password, userType } = req.body;

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "An error occurred during login",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Check if selected user type matches the registered user type
    if (user.userType !== userType) {
      return res.status(401).json({
        success: false,
        message: `You are registered as a ${user.userType}. Please select the correct user type.`,
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "An error occurred during login",
        });
      }

      // Redirect based on user type
      switch (user.userType) {
        case "Patient":
          return res.status(200).json({
            success: true,
            redirect: "/patient/dashboard",
          });
        case "Patient-Navigator":
          return res.status(200).json({
            success: true,
            redirect: "/navigator/dashboard",
          });
        case "Caregiver":
          return res.status(200).json({
            success: true,
            redirect: "/caregiver/dashboard",
          });
        default:
          return res.status(401).json({
            success: false,
            message: "Invalid user type",
          });
      }
    });
  })(req, res, next);
});

app.get("/signup", (req, res) => {
  res.render("pages/auth/signup.ejs");
});

app.post("/signup", async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      email,
      age,
      phone,
      sex,
      address,
      userType,
    } = req.body;

    // Validate required fields
    if (!username || !password || !fullName || !email || !userType) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.username === username
            ? "Username already exists"
            : "Email already registered",
      });
    }

    const user = new User({
      username,
      fullName,
      email,
      age,
      phone,
      sex,
      address,
      userType,
    });

    const registeredUser = await User.register(user, password);

    // Login user after successful registration
    req.login(registeredUser, function (err) {
      if (err) {
        console.error("Error during login after registration:", err);
        return res.status(500).json({
          success: false,
          message:
            "Registration successful but login failed. Please log in manually.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Account created successfully!",
        redirect: `/${userType.toLowerCase().replace("-", "")}/dashboard`,
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during registration",
    });
  }
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

app.get("/patient/dashboard", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/dashboard.ejs", {
    user: req.user,
    path: "/patient/dashboard",
  });
});

app.get("/patient/medical-records", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/medical-records.ejs", {
    user: req.user,
    path: "/patient/medical-records",
  });
});

app.get("/patient/appointments", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/appointments.ejs", {
    user: req.user,
    path: "/patient/appointments",
  });
});

// Add patient navigator page
app.get("/patient/navigator", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/navigator.ejs", {
    user: req.user,
    path: "/patient/navigator",
  });
});

// Add patient chat page
app.get("/patient/messages", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/messages.ejs", {
    user: req.user,
    path: "/patient/messages",
  });
});

// Add patient care plans page
app.get("/patient/care-plans", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/patient/care-plans.ejs", {
    user: req.user,
    path: "/patient/care-plans",
  });
});

app.get("/navigator/dashboard", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/navigator/dashboard.ejs", {
    user: req.user,
    path: "/navigator/dashboard",
  });
});

// Navigator profile routes
app.get("/navigator/profile", isLoggedIn, async (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }

  try {
    // Load NavigatorProfile model
    const NavigatorProfile = require("./models/navigatorProfile");

    // Check if profile exists
    const profile = await NavigatorProfile.findOne({ user: req.user._id });

    res.render("pages/navigator/profile.ejs", {
      user: req.user,
      profile: profile,
      profileExists: !!profile,
      path: "/navigator/profile",
    });
  } catch (error) {
    console.error("Error loading navigator profile:", error);
    res.status(500).send("Error loading profile");
  }
});

// Add navigator requests page
app.get("/navigator/requests", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/navigator/requests.ejs", {
    user: req.user,
    path: "/navigator/requests",
  });
});

// Add navigator patients page
app.get("/navigator/patients", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/navigator/patients.ejs", {
    user: req.user,
    path: "/navigator/patients",
  });
});

// Add navigator messages page
app.get("/navigator/messages", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/navigator/messages.ejs", {
    user: req.user,
    path: "/navigator/messages",
  });
});

// Add navigator patient detail page
app.get("/navigator/patient/:patientId", isLoggedIn, async (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }

  try {
    const patientId = req.params.patientId;

    // Check if navigator has a connection with this patient
    const NavigatorRequest = require("./models/navigatorRequest");
    const connection = await NavigatorRequest.findOne({
      navigator: req.user._id,
      patient: patientId,
      status: "accepted",
    });

    if (!connection) {
      return res.redirect("/navigator/patients");
    }

    // Get patient data
    const User = require("./models/user");
    const patient = await User.findById(patientId);

    if (!patient) {
      return res.redirect("/navigator/patients");
    }

    res.render("pages/navigator/patient-detail.ejs", {
      user: req.user,
      patient: patient,
      patientId: patientId,
      path: "/navigator/patients",
    });
  } catch (error) {
    console.error("Error loading patient details:", error);
    res.redirect("/navigator/patients");
  }
});

// Add navigator care plan creation page
app.get(
  "/navigator/patient/:patientId/care-plan",
  isLoggedIn,
  async (req, res) => {
    if (req.user.userType !== "Patient-Navigator") {
      return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
    }

    try {
      const patientId = req.params.patientId;

      // Check if navigator has a connection with this patient
      const NavigatorRequest = require("./models/navigatorRequest");
      const connection = await NavigatorRequest.findOne({
        navigator: req.user._id,
        patient: patientId,
        status: "accepted",
      });

      if (!connection) {
        return res.redirect("/navigator/patients");
      }

      // Get patient data
      const User = require("./models/user");
      const patient = await User.findById(patientId);

      if (!patient) {
        return res.redirect("/navigator/patients");
      }

      // Get existing care plan if any
      const CarePlan = require("./models/carePlan");
      const carePlan = await CarePlan.findOne({
        patient: patientId,
        creator: req.user._id,
      });

      res.render("pages/navigator/care-plan.ejs", {
        user: req.user,
        patient: patient,
        patientId: patientId,
        carePlan: carePlan || null,
        path: "/navigator/patients",
      });
    } catch (error) {
      console.error("Error loading care plan page:", error);
      res.redirect("/navigator/patients");
    }
  }
);

app.post("/navigator/profile", isLoggedIn, async (req, res) => {
  if (req.user.userType !== "Patient-Navigator") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }

  try {
    // Load NavigatorProfile model
    const NavigatorProfile = require("./models/navigatorProfile");

    // Get form data
    const {
      location,
      navigatorType,
      bio,
      yearsOfExperience,
      wantToBeCertified,
      specialties,
    } = req.body;

    // Handle languages (multiple select)
    const languages = Array.isArray(req.body.languages)
      ? req.body.languages
      : [req.body.languages];

    // Convert wantToBeCertified to boolean
    const wantCertification =
      wantToBeCertified === "on" || wantToBeCertified === true;

    // Handle file upload for proof document
    let proofDocumentURL = null;
    if (req.files && req.files.proofDocument) {
      const file = req.files.proofDocument;
      const fileName = `${Date.now()}-${file.name}`; // Add timestamp to prevent filename conflicts
      const uploadPath = path.join(
        __dirname,
        "public/uploads/navigator_docs/",
        fileName
      );

      await file.mv(uploadPath);
      proofDocumentURL = `/uploads/navigator_docs/${fileName}`;
    }

    // Check if profile exists
    let profile = await NavigatorProfile.findOne({ user: req.user._id });

    if (profile) {
      // Update existing profile
      profile.location = location;
      profile.languages = languages;
      profile.navigatorType = navigatorType;
      profile.bio = bio;
      profile.yearsOfExperience = yearsOfExperience;
      profile.wantToBeCertified = wantCertification;

      // Only update specialties if provided
      if (specialties) {
        profile.specialties = Array.isArray(specialties)
          ? specialties
          : [specialties];
      }

      // Only update proofDocumentURL if a new file was uploaded
      if (proofDocumentURL) {
        profile.proofDocumentURL = proofDocumentURL;
      }

      await profile.save();
    } else {
      // Create new profile
      const newProfile = new NavigatorProfile({
        user: req.user._id,
        location,
        languages,
        navigatorType,
        bio,
        yearsOfExperience,
        wantToBeCertified: wantCertification,
        specialties: specialties
          ? Array.isArray(specialties)
            ? specialties
            : [specialties]
          : [],
        proofDocumentURL,
      });

      await newProfile.save();
    }

    res.redirect("/navigator/profile");
  } catch (error) {
    console.error("Error saving navigator profile:", error);
    res.status(500).send("Error saving profile");
  }
});

app.get("/caregiver/dashboard", isLoggedIn, (req, res) => {
  if (req.user.userType !== "Caregiver") {
    return res.redirect(`/${req.user.userType.toLowerCase()}/dashboard`);
  }
  res.render("pages/caregiver/dashboard.ejs", {
    user: req.user,
    path: "/caregiver/dashboard",
  });
});

// Add medical records routes
app.use("/api/medical-records", medicalRecordsRoutes);

// Use routes
app.use(authRoutes);
app.use(patientRoutes);
app.use(navigatorRoutes);
app.use(caregiverRoutes);
app.use(baselineScreeningRoutes);
app.use("/api/gemini", geminiRoutes);
app.use(navigatorListRoutes);
app.use(chatRoutes);
app.use("/", carePlansRouter);

// Mount routes
app.use('/caregiver', caregiverRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Configure Socket.io for chat
require("./socket/chat")(io);

// Add a server listening section at the end of the file
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

app.get("*", (req, res) => {
  res.redirect("/login");
});
