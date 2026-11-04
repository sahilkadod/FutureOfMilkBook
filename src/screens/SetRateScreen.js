import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { rf, rp, rs, inputHeight, buttonHeight } from '../theme/responsive';
import { formatINR } from '../utils/formatINR';
import { fetchRate, saveRate, selectCurrentRate, selectRateLoading } from '../redux/slices/rateSlice';
import { ThemeContext } from '../theme/ThemeContext';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

export default function SetRateScreen() {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const currentRate = useSelector(selectCurrentRate);
  const loading = useSelector(selectRateLoading);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [rate, setRate] = useState('');

  // Load rate when month/year changes
  useEffect(() => {
    dispatch(fetchRate({ month: selectedMonth, year: selectedYear }))
      .unwrap()
      .then((r) => setRate(r ? r.toString() : ''))
      .catch(() => setRate(''));
  }, [selectedMonth, selectedYear]);

  const handleSave = async () => {
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed < 0) {
      return Alert.alert('Error', 'Please enter a valid rate');
    }
    try {
      await dispatch(saveRate({ month: selectedMonth, year: selectedYear, rate: parsed })).unwrap();
      Alert.alert('Success', 'Rate saved successfully');
    } catch (e) {
      Alert.alert('Error', e || 'Failed to save rate');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.title, { color: theme.textColor }]}>Set Monthly Rate</Text>

      <Text style={[styles.label, { color: theme.textColor }]}>Select Month</Text>
      <Picker
        selectedValue={selectedMonth}
        onValueChange={(value) => setSelectedMonth(value)}
        style={[styles.picker, { color: theme.textColor }]}
      >
        {[...Array(12)].map((_, i) => (
          <Picker.Item
            key={i}
            label={new Date(0, i).toLocaleString('default', { month: 'long' })}
            value={i + 1}
          />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.textColor }]}>Select Year</Text>
      <Picker
        selectedValue={selectedYear}
        onValueChange={(value) => setSelectedYear(value)}
        style={[styles.picker, { color: theme.textColor }]}
      >
        {YEARS.map((year) => (
          <Picker.Item key={year} label={year.toString()} value={year} />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.textColor }]}>Enter Rate (₹ per unit)</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.borderlineColor, color: theme.textColor }]}
        placeholder="Enter Rate"
        placeholderTextColor={theme.textColor + '88'}
        keyboardType="numeric"
        value={rate}
        onChangeText={setRate}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save / Update Rate</Text>
        )}
      </TouchableOpacity>

      {currentRate > 0 && (
        <Text style={[styles.currentRate, { color: theme.textColor }]}>
          Current saved rate: {formatINR(currentRate)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, padding: rp(16) },
  title:       { fontSize: rf(20), fontWeight: 'bold', marginBottom: rp(16), textAlign: 'center' },
  label:       { fontSize: rf(14), marginTop: rp(8) },
  picker:      { marginVertical: rp(8) },
  input:       { borderWidth: 1, paddingHorizontal: rp(12), height: inputHeight, marginVertical: rp(12), borderRadius: rs(8), fontSize: rf(14) },
  button:      { backgroundColor: '#2E86DE', height: buttonHeight, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  buttonText:  { color: '#fff', fontSize: rf(15), fontWeight: '600' },
  currentRate: { marginTop: rp(14), textAlign: 'center', fontSize: rf(13), opacity: 0.7 },
});