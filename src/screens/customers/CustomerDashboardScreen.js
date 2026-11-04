import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, Alert, Share,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMilkEntries, fetchAndSyncMilkFromAPI, selectMilkEntries, selectMilkLoading } from '../../redux/slices/milkSlice';
import { fetchRate, fetchAndSyncRateFromAPI, saveRate, selectCurrentRate } from '../../redux/slices/rateSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import { getContrastColor } from '../../theme/theme';
import { Picker } from '@react-native-picker/picker';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { formatINR } from '../../utils/formatINR';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset } from '../../theme/responsive';


export default function CustomerDashboardScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const { customer } = route.params;

  const headerTextColor = getContrastColor(theme.cardBackground);
  const rowTextColor = getContrastColor(theme.backgroundColor);

  const entries = useSelector(selectMilkEntries);
  const currentRate = useSelector(selectCurrentRate);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [newRate, setNewRate] = useState('');

  // ── Load local first, then sync from API using server_id ──────────────────
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMilkEntries({
        customerId: customer.id,
        month: selectedMonth,
        year: selectedYear,
      }));
      dispatch(fetchAndSyncMilkFromAPI({
        customerId: customer.id,
        serverCustomerId: customer.server_id,
        month: selectedMonth,
        year: selectedYear,
      }));
      dispatch(fetchRate({
        customerId: customer.id,
        month: selectedMonth,
        year: selectedYear,
      }));
      dispatch(fetchAndSyncRateFromAPI({
        customerId: customer.id,
        serverCustomerId: customer.server_id,
        month: selectedMonth,
        year: selectedYear,
      }));
    }, [selectedMonth, selectedYear])
  );

  // Sync rate input when Redux rate changes
  useEffect(() => {
    setNewRate(currentRate ? currentRate.toString() : '');
  }, [currentRate]);

  // Save rate
  const handleSaveRate = async () => {
    const parsedRate = parseFloat(newRate.replace(',', '.'));
    if (isNaN(parsedRate) || parsedRate < 0) {
      return Alert.alert('Invalid Input', 'Enter a valid number');
    }
    try {
      await dispatch(saveRate({
        customerId: customer.id,
        month: selectedMonth,
        year: selectedYear,
        rate: parsedRate,
      })).unwrap();
      Alert.alert('Success', 'Rate saved');
    } catch (err) {
      Alert.alert('Error', 'Failed to save rate');
    }
  };

  // ── Totals calculation ────────────────────────────────────────────────────
  const totals = { totalML: 0, totalMF: 0, totalEL: 0, totalEF: 0, totalLiter: 0, totalFat: 0 };
  let totalSessions = 0; // count each morning and evening separately
  let totalMoney = 0;

  entries.forEach(item => {
    const mLit = parseFloat(item.morning_liter) || 0;
    const mFat = parseFloat(item.morning_fat) || 0;
    const eLit = parseFloat(item.evening_liter) || 0;
    const eFat = parseFloat(item.evening_fat) || 0;

    // Count only sessions that actually have data
    if (mLit > 0) totalSessions++;
    if (eLit > 0) totalSessions++;

    totals.totalML += mLit;
    totals.totalMF += mFat;
    totals.totalEL += eLit;
    totals.totalEF += eFat;

    totalMoney += mLit * mFat * currentRate;
    totalMoney += eLit * eFat * currentRate;
  });

  totals.totalLiter = totals.totalML + totals.totalEL;
  totals.totalFat = totals.totalMF + totals.totalEF;
  const averageFat = totalSessions ? totals.totalFat / totalSessions : 0;

  // Share report
  const shareReport = async () => {
    let message = `Milk Report\n${customer.name}\n${selectedMonth}/${selectedYear}\n\n`;
    entries.forEach(item => {
      if (item.morning_liter || item.evening_liter) {
        const day = new Date(item.date).getDate().toString().padStart(2, '0');
        message += `${day}  M:${item.morning_liter || '-'}L ${item.morning_fat || '-'}F  E:${item.evening_liter || '-'}L ${item.evening_fat || '-'}F\n`;
      }
    });
    message += `\nTotal Liter: ${totals.totalLiter.toFixed(1)}`;
    message += `\nTotal Fat: ${totals.totalFat.toFixed(1)}`;
    message += `\nAvg Fat: ${averageFat.toFixed(2)}`;
    message += `\nRate: ${formatINR(currentRate)}/Fat`;
    message += `\nTotal Money: ${formatINR(totalMoney)}`;
    await Share.share({ message });
  };

  const renderRow = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('MilkEntry', { customer, entry: item })}
      activeOpacity={0.7}
    >
      <View style={[styles.row, { backgroundColor: theme.backgroundColor, borderColor: theme.borderlineColor }]}>
        <Text style={[styles.cellDate, { color: rowTextColor }]}>{parseInt(item.date.split('-')[2], 10)}</Text>
        <Text style={[styles.cell, { color: rowTextColor }]}>{item.morning_liter || '-'}</Text>
        <Text style={[styles.cell, { color: rowTextColor }]}>{item.morning_fat || '-'}</Text>
        <Text style={[styles.cell, { color: rowTextColor }]}>{item.evening_liter || '-'}</Text>
        <Text style={[styles.cell, { color: rowTextColor }]}>{item.evening_fat || '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundColor }}
      behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}
    >
      <View style={{ padding: 10 }}>
        <Text style={[styles.customerName, { backgroundColor: theme.cardBackground, color: headerTextColor }]}>
          {customer.name}
        </Text>

        {/* Month / Year picker */}
        <View style={[styles.filterCard, { borderColor: theme.borderlineColor, backgroundColor: theme.cardBackground }]}>
          <Picker style={styles.picker} selectedValue={selectedMonth} onValueChange={setSelectedMonth} dropdownIconColor={theme.textColor}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <Picker.Item key={i} label={m} value={i + 1} color={theme.textColor} />
            ))}
          </Picker>
          <Picker style={styles.picker} selectedValue={selectedYear} onValueChange={setSelectedYear} dropdownIconColor={theme.textColor}>
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <Picker.Item key={y} label={y.toString()} value={y} color={theme.textColor} />
            ))}
          </Picker>
        </View>

        {/* Rate */}
        <View style={styles.rateCard}>
          <Text style={[styles.rateLabel, { color: theme.textColor }]}>Rate (₹/Fat)</Text>
          <TextInput
            style={[styles.rateInput, { color: theme.textColor, borderColor: theme.borderlineColor }]}
            value={newRate}
            onChangeText={setNewRate}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveRate}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.summaryCardBackground, borderColor: theme.borderlineColor }]}>
          <Text style={[styles.summaryText, { color: theme.summaryCardText }]}>Total Liter: {totals.totalLiter.toFixed(1)}</Text>
          <Text style={[styles.summaryText, { color: theme.summaryCardText }]}>Total Fat: {totals.totalFat.toFixed(1)}</Text>
          <Text style={[styles.summaryText, { color: theme.summaryCardText }]}>Avg Fat: {averageFat.toFixed(2)}</Text>
          <Text style={[styles.summaryText, { color: theme.summaryCardText }]}>Rate: {formatINR(currentRate)}/Fat</Text>
          <Text style={[styles.summaryTextBold, { color: theme.summaryCardText }]}>Total: {formatINR(totalMoney)}</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('MilkEntry', { customer })}
        >
          <IonIcon name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.addButtonText}> Add Milk Entry</Text>
        </TouchableOpacity>
        {/*
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#25D366' }]}
          onPress={shareReport}
        >
          <IonIcon name="share-social-outline" size={22} color="#fff" />
          <Text style={styles.addButtonText}> Share Report</Text>
        </TouchableOpacity>
        */}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#2E7D32' }]}
          onPress={() => navigation.navigate('Bill', {
            customer,
            month: selectedMonth,
            year: selectedYear,
          })}
        >
          <IonIcon name="receipt-outline" size={22} color="#fff" />
          <Text style={styles.addButtonText}> View Bill</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item?.id?.toString() ?? item.date}
        renderItem={renderRow}
        ListHeaderComponent={() => (
          <View style={[styles.tableHeader, { backgroundColor: theme.cardBackground, borderColor: theme.borderlineColor }]}>
            <Text style={[styles.headerDate, { color: headerTextColor }]}>Date</Text>
            <Text style={[styles.cell, { color: headerTextColor }]}>M.L</Text>
            <Text style={[styles.cell, { color: headerTextColor }]}>M.F</Text>
            <Text style={[styles.cell, { color: headerTextColor }]}>E.L</Text>
            <Text style={[styles.cell, { color: headerTextColor }]}>E.F</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={[styles.row, { backgroundColor: theme.cardBackground, borderTopWidth: 2, borderColor: theme.borderlineColor }]}>
            <Text style={[styles.cellDate, { color: headerTextColor, fontWeight: 'bold' }]}>Total</Text>
            <Text style={[styles.cell, { color: headerTextColor, fontWeight: 'bold' }]}>{totals.totalML.toFixed(1)}</Text>
            <Text style={[styles.cell, { color: headerTextColor, fontWeight: 'bold' }]}>{totals.totalMF.toFixed(1)}</Text>
            <Text style={[styles.cell, { color: headerTextColor, fontWeight: 'bold' }]}>{totals.totalEL.toFixed(1)}</Text>
            <Text style={[styles.cell, { color: headerTextColor, fontWeight: 'bold' }]}>{totals.totalEF.toFixed(1)}</Text>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  customerName:    { fontSize: rf(17), fontWeight: 'bold', textAlign: 'center', marginBottom: rp(8), padding: rp(8), borderRadius: rs(6) },
  filterCard:      { flexDirection: 'row', borderRadius: rs(8), marginBottom: rp(8) },
  picker:          { flex: 1 },
  rateCard:        { flexDirection: 'row', alignItems: 'center', marginBottom: rp(8) },
  rateLabel:       { fontSize: rf(13), marginRight: rp(6), fontWeight: '600' },
  rateInput:       { borderWidth: 1, borderRadius: rs(6), paddingHorizontal: rp(8), height: rs(38), flex: 1, marginRight: rp(6), fontSize: rf(13) },
  saveButton:      { backgroundColor: '#2E86DE', paddingHorizontal: rp(10), height: rs(38), borderRadius: rs(6), justifyContent: 'center' },
  saveButtonText:  { color: '#fff', fontWeight: '600', fontSize: rf(13) },
  addButton:       { backgroundColor: '#2E86DE', height: buttonHeight, paddingHorizontal: rp(14), borderRadius: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: rp(8) },
  addButtonText:   { color: '#fff', fontSize: rf(13), fontWeight: '600' },
  summaryCard:     { borderRadius: rs(8), padding: rp(8), marginBottom: rp(8), borderWidth: 1 },
  summaryText:     { fontSize: rf(12), marginVertical: rp(2) },
  summaryTextBold: { fontSize: rf(13), fontWeight: 'bold', marginTop: rp(4) },
  tableHeader:     { flexDirection: 'row', paddingVertical: rp(6), borderBottomWidth: 1, alignItems: 'center', paddingHorizontal: rp(5) },
  headerDate:      { width: rs(42), fontWeight: 'bold', textAlign: 'center', fontSize: rf(12) },
  row:             { flexDirection: 'row', paddingVertical: rp(6), borderBottomWidth: 0.5, borderColor: '#ccc', alignItems: 'center', paddingHorizontal: rp(5) },
  cellDate:        { width: rs(42), textAlign: 'center', fontSize: rf(11), fontWeight: 'bold' },
  cell:            { flex: 1, textAlign: 'center', fontSize: rf(11) },
});
