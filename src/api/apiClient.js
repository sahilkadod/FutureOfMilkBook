import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data;
};

// ─── Convenience methods ──────────────────────────────────────────────────────

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),

  post: (endpoint, body) =>
    apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: (endpoint, body) =>
    apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};