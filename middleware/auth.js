// middleware/auth.js
// Verifies JWT on protected routes

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  // SECURITY: token must be in Authorization header as Bearer token
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, name }
    next();
  } catch (err) {
    // SECURITY: expired or tampered tokens are rejected
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

module.exports = { requireAuth };
