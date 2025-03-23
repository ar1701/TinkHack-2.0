/**
 * Middleware to check if user is logged in
 */
exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Authentication required" });
};

// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Check if user is a patient
exports.isPatient = (req, res, next) => {
  if (req.isAuthenticated() && req.user.userType === 'Patient') {
    return next();
  }
  res.status(403).render('error', { 
    message: 'Access denied', 
    error: { status: 403, stack: 'You are not authorized to access this resource' } 
  });
};

// Check if user is a caregiver
exports.isCaregiver = (req, res, next) => {
  if (req.isAuthenticated() && req.user.userType === 'Caregiver') {
    return next();
  }
  res.status(403).render('error', { 
    message: 'Access denied', 
    error: { status: 403, stack: 'You are not authorized to access this resource' } 
  });
};

// Export all middleware functions
module.exports = { 
  isLoggedIn: exports.isLoggedIn, 
  isAuthenticated: exports.isAuthenticated,
  isPatient: exports.isPatient,
  isCaregiver: exports.isCaregiver
};
