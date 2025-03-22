/**
 * Middleware to check if user is logged in
 */
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Authentication required" });
};

module.exports = { isLoggedIn };
