// src/components/DOBPicker.js
// ─── Date of Birth Picker ─────────────────────────────────────────────────────
// Custom scroll-wheel picker — no extra package needed
// Usage:
//   <DOBPicker value={dob} onChange={setDob} theme={theme} />
//   dob format: "DD/MM/YYYY"

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, FlatList,
  StyleSheet, Dimensions,
} from 'react-native';
import { rf, rp, rs } from '../theme/responsive';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i); // 100 years back

// ─── Single Column Picker ─────────────────────────────────────────────────────
const ColumnPicker = ({ data, selectedIndex, onSelect, renderLabel }) => {
  const ref = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 100);
  }, [selectedIndex]);

  const getItemLayout = (_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    onSelect(clampedIndex);
  };

  return (
    <View style={col.wrap}>
      {/* Selection highlight */}
      <View style={col.highlight} pointerEvents="none" />

      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={col.item}
            onPress={() => {
              onSelect(index);
              ref.current?.scrollToIndex({ index, animated: true });
            }}
          >
            <Text style={[col.itemText, index === selectedIndex && col.selectedText]}>
              {renderLabel ? renderLabel(item) : item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const col = StyleSheet.create({
  wrap:         { flex: 1, height: PICKER_HEIGHT, overflow: 'hidden' },
  highlight:    { position: 'absolute', top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
                  left: 4, right: 4, backgroundColor: '#E8F5E9', borderRadius: rs(8),
                  zIndex: 1 },
  item:         { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText:     { fontSize: rf(15), color: '#999' },
  selectedText: { fontSize: rf(17), fontWeight: '700', color: '#2E7D32' },
});

// ─── Main DOBPicker ───────────────────────────────────────────────────────────
export default function DOBPicker({ value, onChange, theme, label = 'Date of Birth' }) {
  const [visible, setVisible] = useState(false);

  // Parse existing value or use defaults
  const parseValue = () => {
    if (value && value.includes('/')) {
      const [d, m, y] = value.split('/');
      return {
        dayIdx:   Math.max(0, parseInt(d, 10) - 1),
        monthIdx: Math.max(0, parseInt(m, 10) - 1),
        yearIdx:  Math.max(0, YEARS.indexOf(parseInt(y, 10))),
      };
    }
    return { dayIdx: 0, monthIdx: 0, yearIdx: 20 }; // default ~2004
  };

  const parsed = parseValue();
  const [dayIdx,   setDayIdx]   = useState(parsed.dayIdx);
  const [monthIdx, setMonthIdx] = useState(parsed.monthIdx);
  const [yearIdx,  setYearIdx]  = useState(parsed.yearIdx);

  const year  = YEARS[yearIdx]  || YEARS[20];
  const month = monthIdx + 1;
  const days  = getDaysInMonth(month, year);
  const DAYS  = Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'));

  const safeDayIdx = Math.min(dayIdx, days - 1);

  const handleConfirm = () => {
    const d = String(safeDayIdx + 1).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    const y = String(year);
    onChange(`${d}/${m}/${y}`);
    setVisible(false);
  };

  return (
    <>
      {/* Trigger */}
      <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: theme.borderlineColor, backgroundColor: theme.cardBackground || theme.backgroundColor }]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.triggerText, { color: value ? theme.textColor : '#999' }]}>
          {value || 'Select date of birth'}
        </Text>
        <Text style={styles.calIcon}>📅</Text>
      </TouchableOpacity>

      {/* Modal picker */}
      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.backgroundColor }]}>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: theme.textColor }]}>Date of Birth</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmBtn}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Column labels */}
          <View style={styles.colLabels}>
            <Text style={styles.colLabel}>Day</Text>
            <Text style={styles.colLabel}>Month</Text>
            <Text style={styles.colLabel}>Year</Text>
          </View>

          {/* Pickers */}
          <View style={styles.pickersRow}>
            <ColumnPicker
              data={DAYS}
              selectedIndex={safeDayIdx}
              onSelect={setDayIdx}
            />
            <ColumnPicker
              data={MONTHS}
              selectedIndex={monthIdx}
              onSelect={setMonthIdx}
              renderLabel={m => m.slice(0, 3)}
            />
            <ColumnPicker
              data={YEARS}
              selectedIndex={yearIdx}
              onSelect={setYearIdx}
            />
          </View>

        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label:        { fontSize: rf(13), fontWeight: '600', marginBottom: rp(6) },
  trigger:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderWidth: 1, borderRadius: rs(8), paddingHorizontal: rp(12),
                  height: 48, marginBottom: rp(14) },
  triggerText:  { fontSize: rf(14) },
  calIcon:      { fontSize: 18 },

  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20),
                  paddingBottom: rp(30), elevation: 10 },
  sheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: rp(20), paddingVertical: rp(14),
                  borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  sheetTitle:   { fontSize: rf(16), fontWeight: '700' },
  cancelBtn:    { fontSize: rf(14), color: '#999' },
  confirmBtn:   { fontSize: rf(14), color: '#2E7D32', fontWeight: '700' },

  colLabels:    { flexDirection: 'row', paddingHorizontal: rp(16), paddingTop: rp(8) },
  colLabel:     { flex: 1, textAlign: 'center', fontSize: rf(11), color: '#999',
                  textTransform: 'uppercase', letterSpacing: 0.5 },
  pickersRow:   { flexDirection: 'row', paddingHorizontal: rp(8) },
});