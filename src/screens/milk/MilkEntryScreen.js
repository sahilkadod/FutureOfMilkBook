import React, { useContext, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useDispatch } from 'react-redux';
import { saveMilkEntry, editMilkEntry } from '../../redux/slices/milkSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import { getContrastColor } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { rf, rp, rs, inputHeight, buttonHeight, keyboardBehavior, keyboardOffset } from '../../theme/responsive';

export default function MilkEntryScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const dispatch = useDispatch();
  const { customer, entry } = route.params || {};

  const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);
  const [mLiter, setMLiter] = useState(entry?.morning_liter?.toString() || '');
  const [mFat, setMFat] = useState(entry?.morning_fat?.toString() || '');
  const [eLiter, setELiter] = useState(entry?.evening_liter?.toString() || '');
  const [eFat, setEFat] = useState(entry?.evening_fat?.toString() || '');

  const mLiterRef = useRef(null);
  const mFatRef = useRef(null);
  const eLiterRef = useRef(null);
  const eFatRef = useRef(null);

  const handleSave = async () => {
    try {
      const isExisting = entry?.id && !entry.id.toString().startsWith('empty');
      if (isExisting) {
        await dispatch(editMilkEntry({
          entryId: entry.id,
          mLiter: parseFloat(mLiter) || 0,
          mFat: parseFloat(mFat) || 0,
          eLiter: parseFloat(eLiter) || 0,
          eFat: parseFloat(eFat) || 0,
        })).unwrap();
      } else {
        await dispatch(saveMilkEntry({
          customerId: customer.id,
          date,
          mLiter: parseFloat(mLiter) || 0,
          mFat: parseFloat(mFat) || 0,
          eLiter: parseFloat(eLiter) || 0,
          eFat: parseFloat(eFat) || 0,
        })).unwrap();
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const inputBackgroundColor = theme.cardBackground;
  const inputTextColor = getContrastColor(inputBackgroundColor);
  const inputBorderColor = theme.borderlineColor || inputTextColor;
  const buttonTextColor = getContrastColor(theme.secondaryColor);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      behavior={keyboardBehavior} keyboardVerticalOffset={keyboardOffset}
    >
      <Text style={[styles.title, { color: getContrastColor(theme.primaryColor) }]}>
        {customer.name}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: inputTextColor }]}>Date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            style={[styles.input, { color: inputTextColor, backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
            returnKeyType="next"
            onSubmitEditing={() => mLiterRef.current?.focus()}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: inputTextColor }]}>Morning Liter</Text>
            <TextInput ref={mLiterRef} value={mLiter} onChangeText={setMLiter}
              style={[styles.input, { color: inputTextColor, backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
              keyboardType="decimal-pad" returnKeyType="next" blurOnSubmit={false}
              onSubmitEditing={() => mFatRef.current?.focus()} />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: inputTextColor }]}>Morning Fat</Text>
            <TextInput ref={mFatRef} value={mFat} onChangeText={setMFat}
              style={[styles.input, { color: inputTextColor, backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
              keyboardType="decimal-pad" returnKeyType="next" blurOnSubmit={false}
              onSubmitEditing={() => eLiterRef.current?.focus()} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: inputTextColor }]}>Evening Liter</Text>
            <TextInput ref={eLiterRef} value={eLiter} onChangeText={setELiter}
              style={[styles.input, { color: inputTextColor, backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
              keyboardType="decimal-pad" returnKeyType="next" blurOnSubmit={false}
              onSubmitEditing={() => eFatRef.current?.focus()} />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: inputTextColor }]}>Evening Fat</Text>
            <TextInput ref={eFatRef} value={eFat} onChangeText={setEFat}
              style={[styles.input, { color: inputTextColor, backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
              keyboardType="decimal-pad" returnKeyType="done"
              onSubmitEditing={handleSave} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.secondaryColor }]}
          onPress={handleSave}
        >
          <Icon name="save" size={20} color={buttonTextColor} style={{ marginRight: 6 }} />
          <Text style={[styles.saveButtonText, { color: buttonTextColor }]}>
            {entry && !entry.id.toString().startsWith('empty') ? 'Update Entry' : 'Save Entry'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, padding: rp(16) },
  title:          { fontSize: rf(20), fontWeight: 'bold', textAlign: 'center', marginBottom: rp(16), padding: rp(10), borderRadius: rs(10) },
  card:           { padding: rp(16), borderRadius: rs(14), elevation: 4, shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  field:          { marginBottom: rp(14) },
  row:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: rp(14) },
  halfField:      { flex: 0.48 },
  label:          { fontSize: rf(13), marginBottom: rp(6), fontWeight: '600' },
  input:          { borderWidth: 1, borderRadius: rs(10), paddingHorizontal: rp(12), height: inputHeight, fontSize: rf(14) },
  saveButton:     { marginTop: rp(10), height: buttonHeight, borderRadius: rs(12), alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  saveButtonText: { fontWeight: '700', fontSize: rf(15) },
});