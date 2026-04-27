// db/database.js
// Sets up SQLite database, creates tables, seeds initial data

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../smartbuspass.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── CREATE TABLES ───────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,      -- bcrypt hashed, never plain text
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routes (
    id          TEXT    PRIMARY KEY,   -- e.g. "R01"
    from_city   TEXT    NOT NULL,
    to_city     TEXT    NOT NULL,
    price       INTEGER NOT NULL,
    duration    TEXT    NOT NULL,
    seats       INTEGER NOT NULL,
    type        TEXT    NOT NULL       -- Express / Local / Volvo AC
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          TEXT    PRIMARY KEY,   -- e.g. "BK3F9A2C"
    user_id     INTEGER NOT NULL REFERENCES users(id),
    route_id    TEXT    NOT NULL REFERENCES routes(id),
    travel_date TEXT    NOT NULL,
    qty         INTEGER NOT NULL DEFAULT 1,
    total       INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'Active',
    booked_at   TEXT    DEFAULT (datetime('now'))
  );
`);

// ─── SEED ROUTES (only if empty) ─────────────────────────────

const routeCount = db.prepare("SELECT COUNT(*) as c FROM routes").get().c;

if (routeCount === 0) {
  const insert = db.prepare(`
    INSERT INTO routes (id, from_city, to_city, price, duration, seats, type)
    VALUES (@id, @from_city, @to_city, @price, @duration, @seats, @type)
  `);

  const seedRoutes = [
    { id:"R01", from_city:"Amritsar", to_city:"Chandigarh", price:320, duration:"3h 10m", seats:18, type:"Express"  },
    { id:"R02", from_city:"Amritsar", to_city:"Ludhiana",   price:180, duration:"1h 40m", seats:26, type:"Local"    },
    { id:"R03", from_city:"Amritsar", to_city:"Delhi",       price:540, duration:"6h 00m", seats:12, type:"Volvo AC" },
    { id:"R04", from_city:"Amritsar", to_city:"Jalandhar",   price:120, duration:"1h 10m", seats:34, type:"Local"    },
    { id:"R05", from_city:"Amritsar", to_city:"Shimla",      price:420, duration:"5h 20m", seats:8,  type:"Express"  },
    { id:"R06", from_city:"Chandigarh", to_city:"Delhi",     price:350, duration:"4h 00m", seats:20, type:"Volvo AC" },
    { id:"R07", from_city:"Ludhiana",   to_city:"Delhi",     price:420, duration:"4h 30m", seats:22, type:"Express"  },
  ];

  const insertMany = db.transaction((routes) => {
    for (const r of routes) insert.run(r);
  });
  insertMany(seedRoutes);
  console.log("✅ Database seeded with routes.");
}

module.exports = db;
