import { getDBConnection } from './db';

// Add or update milk entry — check first then insert or update
export const addMilkEntry = (userId, customerId, date, mLiter, mFat, eLiter, eFat) => {
  const db = getDBConnection();

  // Check if entry already exists for this customer+date
  const existing = db.execute(
    `SELECT id FROM milk_entries WHERE customer_id = ? AND date = ?`,
    [customerId, date]
  );

  if (existing.rows._array.length > 0) {
    // Update existing entry
    const entryId = existing.rows._array[0].id;
    db.execute(
      `UPDATE milk_entries
       SET morning_liter = ?, morning_fat = ?, evening_liter = ?, evening_fat = ?, synced = 0
       WHERE id = ?`,
      [mLiter, mFat, eLiter, eFat, entryId]
    );
    return entryId;
  } else {
    // Insert new entry
    const result = db.execute(
      `INSERT INTO milk_entries
        (user_id, customer_id, date, morning_liter, morning_fat, evening_liter, evening_fat, created_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)`,
      [userId, customerId, date, mLiter, mFat, eLiter, eFat]
    );
    return result.insertId;
  }
};

// Get milk entries for a customer filtered by month + year
export const getMilkEntriesByCustomer = (userId, customerId, month, year) => {
  const db = getDBConnection();
  const mm = String(month).padStart(2, '0');
  const result = db.execute(
    `SELECT * FROM milk_entries
     WHERE user_id = ? AND customer_id = ? AND date LIKE ?
     ORDER BY date ASC`,
    [userId, customerId, `${year}-${mm}-%`]
  );
  return result.rows._array;
};

// Update milk entry
export const updateMilkEntry = (entryId, userId, mLiter, mFat, eLiter, eFat) => {
  const db = getDBConnection();
  db.execute(
    `UPDATE milk_entries
     SET morning_liter = ?, morning_fat = ?, evening_liter = ?, evening_fat = ?, synced = 0
     WHERE id = ? AND user_id = ?`,
    [mLiter, mFat, eLiter, eFat, entryId, userId]
  );
};

// Get unsynced milk entries for this user
export const getUnsyncedMilkEntries = (userId) => {
  const db = getDBConnection();
  const result = db.execute(
    `SELECT me.*, c.server_id as customer_server_id
     FROM milk_entries me
     JOIN customers c ON me.customer_id = c.id
     WHERE me.user_id = ? AND me.synced = 0`,
    [userId]
  );
  return result.rows._array;
};

// Mark milk entry as synced
export const markMilkEntrySynced = (id, serverId) => {
  const db = getDBConnection();
  db.execute(
    `UPDATE milk_entries SET synced = 1, server_id = ? WHERE id = ?`,
    [serverId, id]
  );
};