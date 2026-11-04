import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCustomerRate, setCustomerRate } from '../../database/rateService';
import { getDBConnection } from '../../database/db';
import { syncAll } from '../../utils/syncService';
import { BASE_URL } from '../../config/api';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchRate = createAsyncThunk(
  'rate/fetchRate',
  async ({ customerId, month, year }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      const rate = getCustomerRate(userId, customerId, month, year);
      return rate || 0;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAndSyncRateFromAPI = createAsyncThunk(
  'rate/fetchAndSyncFromAPI',
  async ({ customerId, month, year }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token || !user) return 0;

      // Fetch from API using server_id of customer
      const db = getDBConnection();

      // Get server_id of this local customer
      const customerRow = db.execute(
        `SELECT server_id FROM customers WHERE id = ?`,
        [customerId]
      );
      const serverCustomerId = customerRow.rows._array[0]?.server_id;

      if (!serverCustomerId) {
        console.log('No server_id for customer — falling back to local rate');
        const localRate = getCustomerRate(user.id, customerId, month, year);
        return localRate || 0;
      }

      // Fetch rate from API
      const response = await fetch(
        `${BASE_URL}/rates?customerId=${serverCustomerId}&month=${month}&year=${year}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) {
        const localRate = getCustomerRate(user.id, customerId, month, year);
        return localRate || 0;
      }

      const apiRates = await response.json();
      console.log('API rates received:', apiRates);

      if (apiRates.length > 0) {
        const apiRate = apiRates[0].rate;
        // Save to local SQLite
        setCustomerRate(user.id, customerId, month, year, apiRate);
        console.log('Rate saved locally:', apiRate);
        return apiRate;
      }

      // No rate on API — fallback to local
      const localRate = getCustomerRate(user.id, customerId, month, year);
      return localRate || 0;

    } catch (error) {
      console.log('fetchAndSyncRateFromAPI error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const saveRate = createAsyncThunk(
  'rate/saveRate',
  async ({ customerId, month, year, rate }, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      setCustomerRate(user.id, customerId, month, year, rate);
      syncAll(token, user.id).catch(console.log);
      return rate;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const rateSlice = createSlice({
  name: 'rate',
  initialState: { currentRate: 0, loading: false, error: null },
  reducers: {
    clearRateError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRate.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRate.fulfilled, (state, action) => { state.loading = false; state.currentRate = action.payload; })
      .addCase(fetchRate.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(fetchAndSyncRateFromAPI.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAndSyncRateFromAPI.fulfilled, (state, action) => { state.loading = false; state.currentRate = action.payload; })
      .addCase(fetchAndSyncRateFromAPI.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(saveRate.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(saveRate.fulfilled, (state, action) => { state.loading = false; state.currentRate = action.payload; })
      .addCase(saveRate.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearRateError } = rateSlice.actions;
export const selectCurrentRate = (state) => state.rate.currentRate;
export const selectRateLoading = (state) => state.rate.loading;
export const selectRateError = (state) => state.rate.error;
export default rateSlice.reducer;