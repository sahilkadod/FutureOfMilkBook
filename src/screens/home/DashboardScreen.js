import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { rf, rp, rs, cardWidth, buttonHeight } from '../../theme/responsive';
import { formatINR, formatINRShort } from '../../utils/formatINR';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchCustomers, fetchAndSyncFromAPI,
  selectAllCustomers, selectCustomersLoading,
} from '../../redux/slices/customerSlice';
import { selectUser } from '../../redux/slices/authSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import { getMilkEntriesByCustomer } from '../../database/milkService';
import { getCustomerRate } from '../../database/rateService';
import IonIcon from 'react-native-vector-icons/Ionicons';

const CARD_WIDTH = cardWidth.half;

// ─── Compute monthly stats per customer ──────────────────────────────────────

const getCustomerStats = (userId, customerId, month, year, rate) => {
  try {
    const entries = getMilkEntriesByCustomer(userId, customerId, month, year);
    let totalLiter = 0, totalFat = 0, totalAmount = 0, days = 0;
    entries.forEach(e => {
      const mL = e.morning_liter || 0;
      const mF = e.morning_fat   || 0;
      const eL = e.evening_liter || 0;
      const eF = e.evening_fat   || 0;
      if (mL > 0 || eL > 0) days++;
      totalLiter  += mL + eL;
      totalFat    += mF + eF;
      totalAmount += mL * mF * rate + eL * eF * rate;
    });
    return { totalLiter, totalFat, totalAmount, days };
  } catch {
    return { totalLiter: 0, totalFat: 0, totalAmount: 0, days: 0 };
  }
};

const AVATAR_COLORS = [
  '#2E7D32', '#1565C0', '#6A1B9A', '#AD1457',
  '#E65100', '#00838F', '#4527A0', '#558B2F',
];

// ─── Customer Card ────────────────────────────────────────────────────────────

const CustomerCard = ({ customer, userId, month, year, onPress, index }) => {
  const rate  = getCustomerRate(userId, customer.id, month, year);
  const stats = getCustomerStats(userId, customer.id, month, year, rate);
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>
          {customer.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      {/* Name */}
      <Text style={styles.cardName} numberOfLines={1}>{customer.name}</Text>
      {customer.phone ? (
        <Text style={styles.cardPhone} numberOfLines={1}>{customer.phone}</Text>
      ) : null}

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{stats.totalLiter.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Liters</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{stats.totalFat.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Fat</Text>
        </View>
      </View>

      {/* Amount */}
      {stats.totalAmount > 0 && (
        <View style={[styles.amountBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.amountText, { color }]}>
            {formatINRShort(stats.totalAmount)}
          </Text>
        </View>
      )}

      {/* Days chip */}
      {stats.days > 0 && (
        <Text style={styles.daysText}>{stats.days} days</Text>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const nav = useNavigation();
  const { theme } = useContext(ThemeContext);
  const dispatch   = useDispatch();
  const customers  = useSelector(selectAllCustomers);
  const loading    = useSelector(selectCustomersLoading);
  const user       = useSelector(selectUser);

  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCustomers());
      dispatch(fetchAndSyncFromAPI());
    }, [])
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const renderHeader = () => (
    <View>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: '#2E7D32' }]}>
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}
          >
            <IonIcon name="menu" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.greeting}>MilkBook 🥛</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CustomerList')}
        >
          <IonIcon name="people-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{customers.length}</Text>
          <Text style={styles.summaryLabel}>Customers</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {customers.reduce((sum, c) => {
              const r = getCustomerRate(user?.id, c.id, month, year);
              const s = getCustomerStats(user?.id, c.id, month, year, r);
              return sum + s.totalLiter;
            }, 0).toFixed(1)}
          </Text>
          <Text style={styles.summaryLabel}>Total Liters</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {formatINRShort(customers.reduce((sum, c) => {
              const r = getCustomerRate(user?.id, c.id, month, year);
              const s = getCustomerStats(user?.id, c.id, month, year, r);
              return sum + s.totalAmount;
            }, 0))}
          </Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Customers</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.backgroundColor }]}>
      <FlatList
        data={customers}
        keyExtractor={item => item.id?.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              dispatch(fetchCustomers());
              dispatch(fetchAndSyncFromAPI());
            }}
            colors={['#2E7D32']}
          />
        }
        renderItem={({ item, index }) => (
          <CustomerCard
            customer={item}
            userId={user?.id}
            month={month}
            year={year}
            index={index}
            onPress={() => navigation.navigate('CustomerDashboard', { customer: item })}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <IonIcon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No customers yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CustomerList')}
            >
              <Text style={styles.emptyBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  topLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn:  { padding: 4 },
  greeting: { fontSize: rf(18), fontWeight: '800', color: '#fff' },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Month picker
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  monthArrow: { paddingHorizontal: 24, paddingVertical: 4 },
  monthArrowText: { fontSize: 26, color: '#2E7D32', fontWeight: '300', lineHeight: 30 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#1B1B1B', minWidth: 140, textAlign: 'center' },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: rf(17), fontWeight: '800', color: '#2E7D32' },
  summaryLabel: { fontSize: rf(9), color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  // Grid
  listContent: { paddingBottom: 24 },
  row: { paddingHorizontal: 12, gap: 12 },

  // Customer card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: rs(14),
    padding: rp(12),
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    alignItems: 'center',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  cardName: { fontSize: rf(13), fontWeight: '700', color: '#1B1B1B', textAlign: 'center' },
  cardPhone: { fontSize: rf(10), color: '#999', marginTop: 2, textAlign: 'center' },
  cardDivider: { width: '100%', height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: rf(13), fontWeight: '800', color: '#1B1B1B' },
  statLabel: { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

  // Amount
  amountBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 4,
  },
  amountText: { fontSize: rf(12), fontWeight: '800' },
  daysText: { fontSize: 10, color: '#bbb', marginTop: 2 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#bbb', marginTop: 12, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: '#2E7D32', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});