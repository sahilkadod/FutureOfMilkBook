import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';
import milkReducer from './slices/milkSlice';
import rateReducer from './slices/rateSlice';
import authReducer from './slices/authSlice';

// ─── Logger Middleware ────────────────────────────────────────────────────────
// Logs every action and the resulting state to the console.
// Automatically disabled in production builds.

const loggerMiddleware = (storeAPI) => (next) => (action) => {
  if (__DEV__) {
    console.group(`Redux: ${action.type}`);
    console.log('Action  :', action);
    console.log('Before  :', storeAPI.getState());
    const result = next(action);
    console.log('After   :', storeAPI.getState());
    console.groupEnd();
    return result;
  }
  return next(action);
};

// ─── Store ────────────────────────────────────────────────────────────────────

const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    milk: milkReducer,
    rate: rateReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
});

export default store;