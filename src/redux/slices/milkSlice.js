import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMilkEntriesByCustomer, addMilkEntry, updateMilkEntry } from '../../database/milkService';
import { getDBConnection } from '../../database/db';
import { syncAll } from '../../utils/syncService';
import { BASE_URL } from '../../config/api';

// ─── Helper to build full month grid ─────────────────────────────────────────

const buildFullMonth = (data, month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const entryMap = {};
  data.forEach(item => (entryMap[item.date] = item));

  const fullMonth = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fullMonth.push(
      entryMap[formattedDate] || {
        id: `empty-${formattedDate}`,
        date: formattedDate,
        morning_liter: 0,
        morning_fat: 0,
        evening_liter: 0,
        evening_fat: 0,
      }
    );
  }
  return fullMonth;
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchMilkEntries = createAsyncThunk(
  'milk/fetchEntries',
  async ({ customerId, month, year }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      const data = getMilkEntriesByCustomer(userId, customerId, month, year);
      return buildFullMonth(data, month, year);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAndSyncMilkFromAPI = createAsyncThunk(
  'milk/fetchAndSyncFromAPI',
  async ({ customerId, serverCustomerId, month, year }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token || !user) return [];

      // Use serverCustomerId for API — fallback to customerId if no server_id
      const apiCustomerId = serverCustomerId || customerId;
      if (!apiCustomerId) return [];

      const response = await fetch(
        `${BASE_URL}/milk?customerId=${apiCustomerId}&month=${month}&year=${year}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (!response.ok) return rejectWithValue('Failed to fetch milk from API');

      const apiEntries = await response.json();
      console.log('API milk entries received:', apiEntries.length);

      const db = getDBConnection();

      for (const e of apiEntries) {

        // 1. Check by server_id — update if exists
        const byServerId = db.execute(
          `SELECT id FROM milk_entries WHERE server_id = ?`,
          [e._id]
        );

        if (byServerId.rows._array.length > 0) {
          const localId = byServerId.rows._array[0].id;
          db.execute(
            `UPDATE milk_entries
             SET morning_liter = ?, morning_fat = ?, evening_liter = ?, evening_fat = ?, synced = 1
             WHERE id = ?`,
            [e.morningLiter, e.morningFat, e.eveningLiter, e.eveningFat, localId]
          );
          console.log('Milk entry updated:', e.date);
          continue;
        }

        // 2. Find local customer id using server_id
        const customerRow = db.execute(
          `SELECT id FROM customers WHERE server_id = ?`,
          [e.customerId]
        );
        const localCustomerId = customerRow.rows._array[0]?.id;

        if (!localCustomerId) {
          console.log('Local customer not found for server_id:', e.customerId);
          continue;
        }

        // 3. Check by customer_id + date to avoid duplicates
        const byDate = db.execute(
          `SELECT id FROM milk_entries WHERE customer_id = ? AND date = ?`,
          [localCustomerId, e.date]
        );

        if (byDate.rows._array.length > 0) {
          // Update existing and link server_id
          const localId = byDate.rows._array[0].id;
          db.execute(
            `UPDATE milk_entries
             SET morning_liter = ?, morning_fat = ?, evening_liter = ?, evening_fat = ?,
                 server_id = ?, synced = 1
             WHERE id = ?`,
            [e.morningLiter, e.morningFat, e.eveningLiter, e.eveningFat, e._id, localId]
          );
          console.log('Milk entry updated and linked:', e.date);
          continue;
        }

        // 4. Insert new entry
        db.execute(
          `INSERT INTO milk_entries
            (user_id, customer_id, date, morning_liter, morning_fat,
             evening_liter, evening_fat, created_at, synced, server_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            user.id, localCustomerId, e.date,
            e.morningLiter, e.morningFat,
            e.eveningLiter, e.eveningFat,
            e.createdAt, e._id,
          ]
        );
        console.log('Milk entry inserted:', e.date);
      }

      // Return fresh local entries
      const localData = getMilkEntriesByCustomer(user.id, customerId, month, year);
      return buildFullMonth(localData, month, year);

    } catch (error) {
      console.log('fetchAndSyncMilkFromAPI error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const saveMilkEntry = createAsyncThunk(
  'milk/saveEntry',
  async ({ customerId, date, mLiter, mFat, eLiter, eFat }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      addMilkEntry(user.id, customerId, date, mLiter, mFat, eLiter, eFat);
      syncAll(token, user.id).catch(console.log);
      return { date, mLiter, mFat, eLiter, eFat };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const editMilkEntry = createAsyncThunk(
  'milk/editEntry',
  async ({ entryId, mLiter, mFat, eLiter, eFat }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      updateMilkEntry(entryId, user.id, mLiter, mFat, eLiter, eFat);
      syncAll(token, user.id).catch(console.log);
      return { entryId, mLiter, mFat, eLiter, eFat };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const milkSlice = createSlice({
  name: 'milk',
  initialState: { entries: [], loading: false, error: null },
  reducers: {
    clearMilkError: (state) => { state.error = null; },
    clearMilkEntries: (state) => { state.entries = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMilkEntries.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMilkEntries.fulfilled, (state, action) => { state.loading = false; state.entries = action.payload; })
      .addCase(fetchMilkEntries.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(fetchAndSyncMilkFromAPI.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAndSyncMilkFromAPI.fulfilled, (state, action) => { state.loading = false; state.entries = action.payload; })
      .addCase(fetchAndSyncMilkFromAPI.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(saveMilkEntry.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(saveMilkEntry.fulfilled, (state) => { state.loading = false; })
      .addCase(saveMilkEntry.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(editMilkEntry.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(editMilkEntry.fulfilled, (state, action) => {
        state.loading = false;
        const { entryId, mLiter, mFat, eLiter, eFat } = action.payload;
        const index = state.entries.findIndex((e) => e.id === entryId);
        if (index !== -1) {
          state.entries[index] = {
            ...state.entries[index],
            morning_liter: mLiter, morning_fat: mFat,
            evening_liter: eLiter, evening_fat: eFat,
          };
        }
      })
      .addCase(editMilkEntry.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearMilkError, clearMilkEntries } = milkSlice.actions;
export const selectMilkEntries = (state) => state.milk.entries;
export const selectMilkLoading = (state) => state.milk.loading;
export const selectMilkError = (state) => state.milk.error;
export default milkSlice.reducer;