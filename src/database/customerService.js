import { getDBConnection } from './db';

// Add customer — always stores with userId
export const addCustomer = (userId, name, phone, address) => {
  const db = getDBConnection();
  const result = db.execute(
    `INSERT INTO customers (user_id, name, phone, address, created_at, synced)
     VALUES (?, ?, ?, ?, datetime('now'), 0)`,
    [userId, name, phone, address]
  );
  return result.insertId;
};

// Get customers — only for this user
export const getCustomers = (userId) => {
  const db = getDBConnection();
  const result = db.execute(
    `SELECT * FROM customers WHERE user_id = ? ORDER BY id DESC`,
    [userId]
  );
  return result.rows._array;
};

// Get unsynced customers for this user
export const getUnsyncedCustomers = (userId) => {
  const db = getDBConnection();
  const result = db.execute(
    `SELECT * FROM customers WHERE user_id = ? AND synced = 0`,
    [userId]
  );
  return result.rows._array;
};

// Mark customer as synced
export const markCustomerSynced = (id, serverId) => {
  const db = getDBConnection();
  db.execute(
    `UPDATE customers SET synced = 1, server_id = ? WHERE id = ?`,
    [serverId, id]
  );
};

// Delete customer
export const deleteCustomerFromDB = (customerId, userId) => {
  const db = getDBConnection();
  db.execute(
    `DELETE FROM customers WHERE id = ? AND user_id = ?`,
    [customerId, userId]
  );
};

// Update customer
export const updateCustomer = (id, userId, name, phone, address) => {
  const db = getDBConnection();
  db.execute(
    `UPDATE customers SET name = ?, phone = ?, address = ?, synced = 0
     WHERE id = ? AND user_id = ?`,
    [name, phone, address, id, userId]
  );
};
