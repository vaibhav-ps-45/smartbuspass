// routes/auth.js
// POST /api/v1/auth/register
// POST /api/v1/auth/login

const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../db/database");

const router = express.Router();

// ─── REGISTER ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // SECURITY: server-side validation (never trust client alone)
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Check if email already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // SECURITY: hash password with bcrypt (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name, email, hashedPassword);

    // Issue JWT
    const token = jwt.sign(
      { id: result.lastInsertRowid, email, name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { id: result.lastInsertRowid, name, email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // SECURITY: same error message for wrong email OR wrong password
    // (prevents user enumeration attacks)
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

module.exports = router;
