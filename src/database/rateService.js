import { getDBConnection } from './db';

// Set or update rate for a customer for a specific month+year
export const setCustomerRate = (userId, customerId, month, year, rate) => {
  const db = getDBConnection();
  db.execute(
    `INSERT INTO customer_rates (user_id, customer_id, month, year, rate, synced)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(customer_id, month, year)
     DO UPDATE SET rate = excluded.rate, synced = 0`,
    [userId, customerId, month, year, rate]
  );
  return true;
};

// Get rate for a customer for a specific month+year
export const getCustomerRate = (userId, customerId, month, year) => {
  const db = getDBConnection();
  const result = db.execute(
    `SELECT rate FROM customer_rates
     WHERE user_id = ? AND customer_id = ? AND month = ? AND year = ?`,
    [userId, customerId, month, year]
  );
  if (result.rows._array.length > 0) {
    return result.rows._array[0].rate;
  }
  return 0;
};

// Get unsynced rates for this user
export const getUnsyncedRates = (userId) => {
  const db = getDBConnection();
  const result = db.execute(
    `SELECT cr.*, c.server_id as customer_server_id
     FROM customer_rates cr
     JOIN customers c ON cr.customer_id = c.id
     WHERE cr.user_id = ? AND cr.synced = 0`,
    [userId]
  );
  return result.rows._array;
};

// Mark rate as synced
export const markRateSynced = (id, serverId) => {
  const db = getDBConnection();
  db.execute(
    `UPDATE customer_rates SET synced = 1, server_id = ? WHERE id = ?`,
    [serverId, id]
  );
};
