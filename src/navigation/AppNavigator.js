import React, { useContext, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useDispatch, useSelector } from 'react-redux';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/home/HomeScreen';
import DashboardScreen from '../screens/home/DashboardScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import AddCustomerScreen from '../screens/customers/AddCustomerScreen';
import UpdateCustomerScreen from '../screens/customers/UpdateCustomerScreen';
import CustomerDashboardScreen from '../screens/customers/CustomerDashboardScreen';
import MilkEntryScreen from '../screens/milk/MilkEntryScreen';
import SetRateScreen from '../screens/SetRateScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import BillScreen from '../screens/customers/BillScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';

import { ThemeContext } from '../theme/ThemeContext';
import {
  loadStoredAuth, logoutUser,
  selectIsLoggedIn, selectIsAuthChecked, selectUser,
} from '../redux/slices/authSlice';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ── Custom Drawer Content ─────────────────────────────────────────────────────

function CustomDrawerContent(props) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={[styles.userHeader, { backgroundColor: '#2E86DE' }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userPhone}>{user?.phone || ''}</Text>
      </View>

      <DrawerItemList {...props} />

      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => props.navigation.navigate('Home', { screen: 'Profile' })}
        >
          <MaterialIcon name="person-outline" size={20} color="#2E7D32" />
          <Text style={styles.profileText}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => dispatch(logoutUser())}
        >
          <MaterialIcon name="logout" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ── Auth Stack ────────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Shared screenOptions factory ────────────────────────────────────────────

const makeScreenOptions = (drawerNavigation, theme, rootScreen) => ({ route, navigation }) => ({
  headerStyle: { backgroundColor: theme.backgroundColor },
  headerTintColor: theme.textColor,
  headerTitleStyle: { fontWeight: 'bold' },
  headerLeft: () => {
    if (route.name === rootScreen) {
      return (
        <TouchableOpacity
          onPress={() => drawerNavigation.toggleDrawer()}
          style={{ marginLeft: 15 }}
        >
          <IonIcon name="menu" size={26} color={theme.textColor} />
        </TouchableOpacity>
      );
    }
    // Show back arrow for all other screens
    return (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginLeft: 15 }}
      >
        <IonIcon name="arrow-back" size={26} color={theme.textColor} />
      </TouchableOpacity>
    );
  },
});

// ── Home Stack ────────────────────────────────────────────────────────────────

function HomeStack({ navigation: drawerNavigation }) {
  const { theme } = useContext(ThemeContext);
  return (
    <Stack.Navigator screenOptions={makeScreenOptions(drawerNavigation, theme, 'HomeScreen')}>
      <Stack.Screen name="HomeScreen" component={DashboardScreen} options={{ title: 'MilkBook', headerShown: false }} />
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} options={{ title: 'Customer Dashboard' }} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: 'Add Customer' }} />
      <Stack.Screen name="MilkEntry" component={MilkEntryScreen} options={{ title: 'Milk Entry' }} />
      <Stack.Screen name="SetRate" component={SetRateScreen} options={{ title: 'Set Rate' }} />
      <Stack.Screen name="Bill" component={BillScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}

// ── Customer Stack ────────────────────────────────────────────────────────────

function CustomerStack({ navigation: drawerNavigation }) {
  const { theme } = useContext(ThemeContext);
  return (
    <Stack.Navigator screenOptions={makeScreenOptions(drawerNavigation, theme, 'CustomerList')}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: 'Add Customer' }} />
      <Stack.Screen name="UpdateCustomer" component={UpdateCustomerScreen} options={{ title: 'Update Customer' }} />
      <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} options={{ title: 'Customer Dashboard' }} />
      <Stack.Screen name="MilkEntry" component={MilkEntryScreen} options={{ title: 'Milk Entry' }} />
      <Stack.Screen name="SetRate" component={SetRateScreen} options={{ title: 'Set Rate' }} />
      <Stack.Screen name="Bill" component={BillScreen} />
    </Stack.Navigator>
  );
}

// ── App Drawer ────────────────────────────────────────────────────────────────

function AppDrawer() {
  const { theme } = useContext(ThemeContext);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2E86DE',
        drawerInactiveTintColor: theme.textColor,
        drawerLabelStyle: { fontSize: 16 },
        drawerStyle: { backgroundColor: theme.backgroundColor },
      }}
    >
      <Drawer.Screen
        name="Home"
        options={{
          drawerIcon: ({ color, size }) => (
            <IonIcon name="home-outline" size={size} color={color} />
          ),
        }}
      >
        {props => <HomeStack {...props} />}
      </Drawer.Screen>

      <Drawer.Screen
        name="Customers"
        options={{
          drawerIcon: ({ color, size }) => (
            <IonIcon name="people-outline" size={22} color={color} />
          ),
        }}
      >
        {props => <CustomerStack {...props} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAuthChecked = useSelector(selectIsAuthChecked);

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, []);

  if (!isAuthChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E86DE" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <AppDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  userHeader: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  logoutContainer: {
    marginTop: 'auto',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    padding: 16,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    marginBottom: 4,
  },
  profileText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
});