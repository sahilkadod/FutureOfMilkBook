import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserData, migrateOrphanRows } from '../../database/db';
import { fetchAndSyncFromAPI } from './customerSlice';
import { BASE_URL } from '../../config/api';


export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, phone, password, dob }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, dob }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Registration failed');
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      migrateOrphanRows(data.user.id);
      // Fetch this user's customers from API and cache locally
      dispatch(fetchAndSyncFromAPI());
      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ phone, password }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Login failed');
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      migrateOrphanRows(data.user.id);
      // Fetch this user's customers from API and cache locally
      dispatch(fetchAndSyncFromAPI());
      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        const parsedUser = JSON.parse(user);
        migrateOrphanRows(parsedUser.id);
        // Sync from API on app start too
        dispatch(fetchAndSyncFromAPI());
        return { token, user: parsedUser };
      }
      return null;
    } catch (error) {
      return rejectWithValue('Failed to load auth');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState, dispatch }) => {
    const userId = getState().auth.user?.id;
    if (userId) clearUserData(userId);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    dispatch({ type: 'customers/clearCustomers' });
    dispatch({ type: 'milk/clearMilkEntries' });
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    user: null,
    loading: false,
    error: null,
    isAuthChecked: false,
  },
  reducers: {
    clearAuthError: (state) => { state.error = null; },
    updateUser: (state, action) => { state.user = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => { state.loading = false; state.token = action.payload.token; state.user = action.payload.user; })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.token = action.payload.token; state.user = action.payload.user; })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    builder
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isAuthChecked = true;
        if (action.payload) { state.token = action.payload.token; state.user = action.payload.user; }
      })
      .addCase(loadStoredAuth.rejected, (state) => { state.isAuthChecked = true; });
    builder
      .addCase(logoutUser.fulfilled, (state) => { state.token = null; state.user = null; });
  },
});

export const { clearAuthError, updateUser } = authSlice.actions;
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthChecked = (state) => state.auth.isAuthChecked;
export const selectIsLoggedIn = (state) => !!state.auth.token;
export default authSlice.reducer;