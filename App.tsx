import 'react-native-gesture-handler';
import React, { useEffect, useContext } from 'react';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { requestStoragePermission } from './src/utils/permissions';
import { MenuProvider } from 'react-native-popup-menu';

import AppNavigator from './src/navigation/AppNavigator';
import { createTables } from './src/database/db';
import { ThemeProvider, ThemeContext } from './src/theme/ThemeContext';
import store from './src/redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from './src/redux/slices/authSlice';
import { fetchAndSyncFromAPI } from './src/redux/slices/customerSlice';
import { fetchAndSyncMilkFromAPI } from './src/redux/slices/milkSlice';
import { fetchAndSyncRateFromAPI } from './src/redux/slices/rateSlice';

// -------------------- INITIALIZATION FUNCTION --------------------
const initializeApp = async () => {
  try {
    await createTables();
  } catch (err) {
    console.error('App initialization error:', err);
  }
};

// -------------------- MAIN APP COMPONENT --------------------
function AppContent() {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user) return undefined;

    let active = AppState.currentState === 'active';
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refreshSharedRecords = async () => {
      if (!active || busy) return;
      busy = true;
      try {
        const customers = await dispatch(fetchAndSyncFromAPI()).unwrap();
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        await Promise.all(customers.map(async customer => {
          if (!customer.server_id) return;
          await Promise.all([
            dispatch(fetchAndSyncMilkFromAPI({customerId: customer.id, serverCustomerId: customer.server_id, month, year})).unwrap(),
            dispatch(fetchAndSyncRateFromAPI({customerId: customer.id, serverCustomerId: customer.server_id, month, year})).unwrap(),
          ]);
        }));
      } catch (error) {
        console.log('Background data refresh skipped:', error instanceof Error ? error.message : error);
      } finally {
        busy = false;
        if (active) timer = setTimeout(refreshSharedRecords, 30000);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (active) {
        clearTimeout(timer);
        void refreshSharedRecords();
      } else {
        clearTimeout(timer);
      }
    });

    void refreshSharedRecords();
    return () => {
      active = false;
      clearTimeout(timer);
      appStateSubscription.remove();
    };
  }, [dispatch, user?.id]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.backgroundColor}
      />
      <AppNavigator />
    </SafeAreaView>
  );
}

export default function App() {
  useEffect(() => {
    initializeApp();
    requestStoragePermission();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider>
          <SafeAreaProvider>
            <MenuProvider>
              <AppContent />
            </MenuProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
