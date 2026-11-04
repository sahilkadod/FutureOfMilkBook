import NetInfo from '@react-native-community/netinfo';
import { getUnsyncedCustomers, markCustomerSynced } from '../database/customerService';
import { getUnsyncedMilkEntries, markMilkEntrySynced } from '../database/milkService';
import { getUnsyncedRates, markRateSynced } from '../database/rateService';
import { BASE_URL } from '../config/api';

const apiRequest = async (method, endpoint, token, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sync failed');
  return data;
};

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};

export const syncAll = async (token, userId) => {
  if (!token || !userId) return;

  const online = await isOnline();
  if (!online) {
    console.log('Sync skipped — no internet');
    return;
  }

  console.log('Starting sync...');

  // 1. Sync customers
  const unsyncedCustomers = getUnsyncedCustomers(userId);
  for (const customer of unsyncedCustomers) {
    try {
      if (customer.server_id) {
        // ✅ Already on server — UPDATE with PUT
        await apiRequest('PUT', `/customers/${customer.server_id}`, token, {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        });
        markCustomerSynced(customer.id, customer.server_id);
        console.log(`Customer updated on server: ${customer.name}`);
      } else {
        // ✅ New customer — CREATE with POST
        const result = await apiRequest('POST', '/customers', token, {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        });
        markCustomerSynced(customer.id, result._id);
        console.log(`Customer created on server: ${customer.name}`);
      }
    } catch (err) {
      console.log(`Customer sync failed: ${customer.name}`, err.message);
    }
  }

  // 2. Sync milk entries
  const unsyncedEntries = getUnsyncedMilkEntries(userId);
  for (const entry of unsyncedEntries) {
    try {
      if (entry.server_id) {
        // ✅ Already on server — UPDATE with PUT
        await apiRequest('PUT', `/milk/${entry.server_id}`, token, {
          morningLiter: entry.morning_liter,
          morningFat: entry.morning_fat,
          eveningLiter: entry.evening_liter,
          eveningFat: entry.evening_fat,
        });
        markMilkEntrySynced(entry.id, entry.server_id);
        console.log(`Milk entry updated on server: ${entry.date}`);
      } else {
        // ✅ New entry — CREATE with POST
        if (!entry.customer_server_id) {
          console.log('Milk entry skipped — customer not synced yet');
          continue;
        }
        const result = await apiRequest('POST', '/milk', token, {
          customerId: entry.customer_server_id,
          date: entry.date,
          morningLiter: entry.morning_liter,
          morningFat: entry.morning_fat,
          eveningLiter: entry.evening_liter,
          eveningFat: entry.evening_fat,
        });
        markMilkEntrySynced(entry.id, result._id);
        console.log(`Milk entry created on server: ${entry.date}`);
      }
    } catch (err) {
      console.log(`Milk entry sync failed: ${entry.date}`, err.message);
    }
  }

  // 3. Sync rates
  const unsyncedRates = getUnsyncedRates(userId);
  for (const rate of unsyncedRates) {
    try {
      if (!rate.customer_server_id) {
        console.log('Rate sync skipped — customer not synced yet');
        continue;
      }
      const result = await apiRequest('POST', '/rates', token, {
        customerId: rate.customer_server_id,
        month: rate.month,
        year: rate.year,
        rate: rate.rate,
      });
      markRateSynced(rate.id, result._id);
      console.log(`Rate synced: ${rate.month}/${rate.year}`);
    } catch (err) {
      console.log(`Rate sync failed`, err.message);
    }
  }

  console.log('Sync complete');
};