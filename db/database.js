// db/database.js
// SQLite setup compatible with Render

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../smartbuspass.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// CREATE TABLES
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      from_city TEXT,
      to_city TEXT,
      price INTEGER,
      duration TEXT,
      seats INTEGER,
      type TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      route_id TEXT,
      travel_date TEXT,
      qty INTEGER,
      total INTEGER,
      status TEXT DEFAULT 'Active',
      booked_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed data (simple)
  db.get("SELECT COUNT(*) as count FROM routes", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO routes VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const routes = [
        ["R01","Amritsar","Chandigarh",320,"3h 10m",18,"Express"],
        ["R02","Amritsar","Ludhiana",180,"1h 40m",26,"Local"],
        ["R03","Amritsar","Delhi",540,"6h 00m",12,"Volvo AC"]
      ];

      routes.forEach(r => stmt.run(r));
      stmt.finalize();

      console.log("Seeded routes");
    }
  });
});

module.exports = db;