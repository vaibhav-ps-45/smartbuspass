// routes/routes.js
// GET /api/v1/routes          — list all (with optional ?from= &to= filters)
// GET /api/v1/routes/:id      — single route detail

const express = require("express");
const db      = require("../db/database");

const router = express.Router();

// ─── GET ALL ROUTES (with optional search filters) ───────────
router.get("/", (req, res) => {
  try {
    const { from, to } = req.query;

    let query = "SELECT * FROM routes WHERE 1=1";
    const params = [];

    // SECURITY: using parameterised queries — never string-concatenate user input
    if (from) { query += " AND LOWER(from_city) LIKE ?"; params.push(`%${from.toLowerCase()}%`); }
    if (to)   { query += " AND LOWER(to_city)   LIKE ?"; params.push(`%${to.toLowerCase()}%`);   }

    const routes = db.prepare(query).all(...params);

    // Rename DB columns to camelCase for the frontend
    const formatted = routes.map(r => ({
      id:       r.id,
      from:     r.from_city,
      to:       r.to_city,
      price:    r.price,
      duration: r.duration,
      seats:    r.seats,
      type:     r.type,
    }));

    res.json({ routes: formatted, count: formatted.length });
  } catch (err) {
    console.error("Routes fetch error:", err);
    res.status(500).json({ error: "Could not fetch routes." });
  }
});

// ─── GET SINGLE ROUTE ────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const route = db.prepare("SELECT * FROM routes WHERE id = ?").get(req.params.id);
    if (!route) return res.status(404).json({ error: "Route not found." });

    res.json({
      id:       route.id,
      from:     route.from_city,
      to:       route.to_city,
      price:    route.price,
      duration: route.duration,
      seats:    route.seats,
      type:     route.type,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch route." });
  }
});

module.exports = router;
