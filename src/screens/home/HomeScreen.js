import React, { useContext, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCustomers,
  fetchAndSyncFromAPI,
  selectAllCustomers,
  selectCustomersLoading,
} from '../../redux/slices/customerSlice';
import { selectUser } from '../../redux/slices/authSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { rf, rp, rs, wp, buttonHeight } from '../../theme/responsive';

export default function HomeScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const customers = useSelector(selectAllCustomers);
  const loading = useSelector(selectCustomersLoading);
  const user = useSelector(selectUser);

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchAndSyncFromAPI());
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>

      {/* Welcome Header */}
      <View style={[styles.headerCard, { backgroundColor: '#2E86DE' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <Image
            source={require('../../assets/logo/Milk-Book-Logo-no-bg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {new Date().toLocaleString('default', { month: 'short' })}
            </Text>
            <Text style={styles.statLabel}>
              {new Date().getFullYear()}
            </Text>
          </View>
        </View>
      </View>

      {/* Add Customer Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('Customers', { screen: 'AddCustomer' })}
      >
        <MaterialIcon name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.addButtonText}>Add New Customer</Text>
      </TouchableOpacity>

      {/* Customers Section */}
      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
        Your Customers
      </Text>

      {customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IonIcon name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No customers yet</Text>
          <Text style={styles.emptySubText}>Tap "Add New Customer" to get started</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => (item?.id ?? item?.name ?? Math.random()).toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Customers', {
                screen: 'CustomerDashboard',
                params: { customer: item },
              })}
            >
              <View style={[styles.customerCard, {
                borderColor: theme.borderlineColor,
                backgroundColor: theme.cardBackground,
              }]}>
                {/* Avatar */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                {/* Info */}
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: theme.textColor }]}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                  ) : null}
                </View>
                {/* Arrow */}
                <IonIcon name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: rp(14) },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  logo: {
    width: 60,
    height: 60,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 6,
    textAlign: 'center',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E86DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: { fontSize: rf(15), fontWeight: '600' },
  customerPhone: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
});