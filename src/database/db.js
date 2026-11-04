import { open } from 'react-native-nitro-sqlite';

let db;

export const getDBConnection = () => {
  if (!db) {
    db = open({ name: 'milkbook.db' });
    db.execute('PRAGMA foreign_keys = ON');
  }
  return db;
};

export const createTables = () => {
  const database = getDBConnection();

  database.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at TEXT,
      synced INTEGER DEFAULT 0,
      server_id TEXT DEFAULT NULL
    );
  `);

  database.execute(`
    CREATE TABLE IF NOT EXISTS milk_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '',
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      morning_liter REAL DEFAULT 0,
      morning_fat REAL DEFAULT 0,
      evening_liter REAL DEFAULT 0,
      evening_fat REAL DEFAULT 0,
      created_at TEXT,
      synced INTEGER DEFAULT 0,
      server_id TEXT DEFAULT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);

  database.execute(`
    CREATE TABLE IF NOT EXISTS customer_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '',
      customer_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      rate REAL NOT NULL DEFAULT 0,
      synced INTEGER DEFAULT 0,
      server_id TEXT DEFAULT NULL,
      UNIQUE(customer_id, month, year),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);

  runMigrations(database);
};

const runMigrations = (database) => {
  try { database.execute(`ALTER TABLE customers ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`); } catch (e) {}
  try { database.execute(`ALTER TABLE customers ADD COLUMN synced INTEGER DEFAULT 0`); } catch (e) {}
  try { database.execute(`ALTER TABLE customers ADD COLUMN server_id TEXT DEFAULT NULL`); } catch (e) {}
  try { database.execute(`ALTER TABLE milk_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`); } catch (e) {}
  try { database.execute(`ALTER TABLE milk_entries ADD COLUMN synced INTEGER DEFAULT 0`); } catch (e) {}
  try { database.execute(`ALTER TABLE milk_entries ADD COLUMN server_id TEXT DEFAULT NULL`); } catch (e) {}

  // ── Permanent fix: recreate milk_entries with UNIQUE(customer_id, date) ──
  try {
    // 1. Rename old table
    database.execute(`ALTER TABLE milk_entries RENAME TO milk_entries_old`);

    // 2. Create new table with UNIQUE constraint
    database.execute(`
      CREATE TABLE milk_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT '',
        customer_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        morning_liter REAL DEFAULT 0,
        morning_fat REAL DEFAULT 0,
        evening_liter REAL DEFAULT 0,
        evening_fat REAL DEFAULT 0,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        server_id TEXT DEFAULT NULL,
        UNIQUE(customer_id, date),
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    // 3. Copy old data into new table
    database.execute(`
      INSERT OR IGNORE INTO milk_entries
        (id, user_id, customer_id, date, morning_liter, morning_fat,
         evening_liter, evening_fat, created_at, synced, server_id)
      SELECT
        id, user_id, customer_id, date, morning_liter, morning_fat,
        evening_liter, evening_fat, created_at, synced, server_id
      FROM milk_entries_old
    `);

    // 4. Drop old table
    database.execute(`DROP TABLE milk_entries_old`);

    console.log('Migration: milk_entries recreated with UNIQUE constraint');
  } catch (e) {
    // Already done — ignore
    console.log('milk_entries migration skipped:', e.message);
  }

  // customer_rates table
  try {
    database.execute(`
      CREATE TABLE IF NOT EXISTS customer_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT '',
        customer_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        rate REAL NOT NULL DEFAULT 0,
        synced INTEGER DEFAULT 0,
        server_id TEXT DEFAULT NULL,
        UNIQUE(customer_id, month, year),
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}
};

// Assigns orphan rows (user_id='') to logged-in user — called on login/register/app start
export const migrateOrphanRows = (userId) => {
  const database = getDBConnection();
  try {
    database.execute(`UPDATE customers SET user_id = ? WHERE user_id = '' OR user_id IS NULL`, [userId]);
    database.execute(`UPDATE milk_entries SET user_id = ? WHERE user_id = '' OR user_id IS NULL`, [userId]);
    database.execute(`UPDATE customer_rates SET user_id = ? WHERE user_id = '' OR user_id IS NULL`, [userId]);
    console.log('Orphan rows migrated to user:', userId);
  } catch (e) {
    console.log('migrateOrphanRows error:', e);
  }
};

// Wipe all data for a specific user — called on logout
export const clearUserData = (userId) => {
  const database = getDBConnection();
  database.execute(`DELETE FROM milk_entries WHERE user_id = ?`, [userId]);
  database.execute(`DELETE FROM customer_rates WHERE user_id = ?`, [userId]);
  database.execute(`DELETE FROM customers WHERE user_id = ?`, [userId]);
};
