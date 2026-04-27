// routes/bookings.js
// GET  /api/v1/bookings       — list MY bookings (auth required)
// POST /api/v1/bookings       — create booking  (auth required)
// GET  /api/v1/bookings/:id   — single booking  (auth required)

const express     = require("express");
const db          = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All booking routes require a valid JWT
router.use(requireAuth);

// ─── LIST MY BOOKINGS ────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    // SECURITY: req.user.id comes from verified JWT — users can only see their own bookings
    const bookings = db.prepare(`
      SELECT b.*, r.from_city, r.to_city, r.type, r.duration
      FROM bookings b
      JOIN routes r ON b.route_id = r.id
      WHERE b.user_id = ?
      ORDER BY b.booked_at DESC
    `).all(req.user.id);

    const formatted = bookings.map(b => ({
      id:          b.id,
      routeId:     b.route_id,
      from:        b.from_city,
      to:          b.to_city,
      type:        b.type,
      duration:    b.duration,
      travelDate:  b.travel_date,
      qty:         b.qty,
      total:       b.total,
      status:      b.status,
      bookedAt:    b.booked_at,
    }));

    res.json({ bookings: formatted, count: formatted.length });
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).json({ error: "Could not fetch bookings." });
  }
});

// ─── CREATE BOOKING ──────────────────────────────────────────
router.post("/", (req, res) => {
  try {
    const { routeId, travelDate, qty = 1 } = req.body;

    // SECURITY: validate all inputs server-side
    if (!routeId || !travelDate) {
      return res.status(400).json({ error: "routeId and travelDate are required." });
    }
    if (qty < 1 || qty > 10) {
      return res.status(400).json({ error: "Quantity must be between 1 and 10." });
    }

    // Validate travel date is not in the past
    const today = new Date().toISOString().split("T")[0];
    if (travelDate < today) {
      return res.status(400).json({ error: "Travel date cannot be in the past." });
    }

    // Check route exists
    const route = db.prepare("SELECT * FROM routes WHERE id = ?").get(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found." });
    }

    // Check seat availability
    const bookedQty = db.prepare(`
      SELECT COALESCE(SUM(qty), 0) as booked
      FROM bookings
      WHERE route_id = ? AND travel_date = ? AND status != 'Cancelled'
    `).get(routeId, travelDate).booked;

    if (bookedQty + qty > route.seats) {
      return res.status(409).json({
        error: `Only ${route.seats - bookedQty} seats available on this date.`
      });
    }

    // Generate booking ID
    const bookingId = "BK" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const total = route.price * qty;

    db.prepare(`
      INSERT INTO bookings (id, user_id, route_id, travel_date, qty, total, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Active')
    `).run(bookingId, req.user.id, routeId, travelDate, qty, total);

    res.status(201).json({
      message: "Booking confirmed!",
      booking: {
        id:         bookingId,
        routeId,
        from:       route.from_city,
        to:         route.to_city,
        type:       route.type,
        travelDate,
        qty,
        total,
        status:     "Active",
        bookedAt:   new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Booking create error:", err);
    res.status(500).json({ error: "Could not create booking." });
  }
});

// ─── GET SINGLE BOOKING ──────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, r.from_city, r.to_city, r.type, r.duration, r.price
      FROM bookings b
      JOIN routes r ON b.route_id = r.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json({
      id:         booking.id,
      from:       booking.from_city,
      to:         booking.to_city,
      type:       booking.type,
      duration:   booking.duration,
      travelDate: booking.travel_date,
      qty:        booking.qty,
      total:      booking.total,
      status:     booking.status,
      bookedAt:   booking.booked_at,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch booking." });
  }
});

module.exports = router;
