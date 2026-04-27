// server.js — SmartBusPass API entry point

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");

// Import routes
const authRoutes     = require("./routes/auth");
const routeRoutes    = require("./routes/routes");
const bookingRoutes  = require("./routes/bookings");

// Initialise DB (creates tables + seeds data on first run)
require("./db/database");

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────

// CORS — only allow requests from your frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// SECURITY: rate limiting — max 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
});
app.use(limiter);

// Stricter limit on auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please wait 15 minutes." },
});

// Parse JSON bodies
app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────────

app.use("/api/v1/auth",     authLimiter, authRoutes);
app.use("/api/v1/routes",   routeRoutes);
app.use("/api/v1/bookings", bookingRoutes);

// Health check endpoint (useful for Render.com uptime checks)
app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "SmartBusPass API", time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ SmartBusPass API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
