import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BASE_URL } from '../../config/api';
import {
  addCustomer, getCustomers,
  deleteCustomerFromDB, updateCustomer,
} from '../../database/customerService';
import { getDBConnection } from '../../database/db';
import { syncAll } from '../../utils/syncService';

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      return getCustomers(userId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAndSyncFromAPI = createAsyncThunk(
  'customers/fetchAndSync',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token || !user) return [];

      const response = await fetch(`${BASE_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const apiCustomers = await response.json();
      if (!response.ok) return rejectWithValue('Failed to fetch from API');

      const db = getDBConnection();

      for (const c of apiCustomers) {

        // 1. Check by server_id — if found, UPDATE with latest API data
        const byServerId = db.execute(
          `SELECT id FROM customers WHERE server_id = ?`,
          [c._id]
        );

        if (byServerId.rows._array.length > 0) {
          const localId = byServerId.rows._array[0].id;
          db.execute(
            `UPDATE customers SET name = ?, phone = ?, address = ?, synced = 1
             WHERE id = ?`,
            [c.name, c.phone || '', c.address || '', localId]
          );
          console.log('Customer updated locally:', c.name);
          continue;
        }

        // 2. Check by name + phone — if found, link server_id
        const byNamePhone = db.execute(
          `SELECT id FROM customers WHERE name = ? AND phone = ? AND user_id = ?`,
          [c.name, c.phone || '', user.id]
        );

        if (byNamePhone.rows._array.length > 0) {
          const localId = byNamePhone.rows._array[0].id;
          db.execute(
            `UPDATE customers SET server_id = ?, synced = 1, address = ?
             WHERE id = ?`,
            [c._id, c.address || '', localId]
          );
          console.log('Customer matched and linked:', c.name);
          continue;
        }

        // 3. Not found — INSERT new
        db.execute(
          `INSERT INTO customers (user_id, name, phone, address, created_at, synced, server_id)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [user.id, c.name, c.phone || '', c.address || '', c.createdAt || '', c._id]
        );
        console.log('Customer inserted locally:', c.name);
      }

      return getCustomers(user.id);
    } catch (error) {
      console.log('fetchAndSyncFromAPI error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/create',
  async ({ name, phone, address }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      addCustomer(user.id, name, phone, address);
      const customers = getCustomers(user.id);
      syncAll(token, user.id).catch(console.log);
      return customers;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeCustomer = createAsyncThunk(
  'customers/remove',
  async (customerId, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      deleteCustomerFromDB(customerId, userId);
      return customerId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const editCustomer = createAsyncThunk(
  'customers/edit',
  async ({ id, name, phone, address }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      updateCustomer(id, user.id, name, phone, address);
      syncAll(token, user.id).catch(console.log);
      return { id, name, phone, address };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const customerSlice = createSlice({
  name: 'customers',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearCustomers: (state) => { state.list = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchCustomers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(fetchAndSyncFromAPI.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAndSyncFromAPI.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchAndSyncFromAPI.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(createCustomer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createCustomer.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(createCustomer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(removeCustomer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(removeCustomer.fulfilled, (state, action) => { state.loading = false; state.list = state.list.filter((c) => c.id !== action.payload); })
      .addCase(removeCustomer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(editCustomer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(editCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.list[index] = { ...state.list[index], ...action.payload };
      })
      .addCase(editCustomer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

// ─── Actions & Selectors ─────────────────────────────────────────────────────

export const { clearError, clearCustomers } = customerSlice.actions;
export const selectAllCustomers = (state) => state.customers.list;
export const selectCustomersLoading = (state) => state.customers.loading;
export const selectCustomersError = (state) => state.customers.error;
export default customerSlice.reducer;