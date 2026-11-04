import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';

import RNPrint from 'react-native-print';
import { LOGO_BASE64 } from '../../utils/logoBase64';
import Svg, { Polyline, Line, Text as SvgText, Circle, Rect } from 'react-native-svg';
import { selectUser } from '../../redux/slices/authSlice';
import { formatINR } from '../../utils/formatINR';
import { getMilkEntriesByCustomer } from '../../database/milkService';
import { getCustomerRate } from '../../database/rateService';

// ─── Bill Calculation ─────────────────────────────────────────────────────────

/**
 * Fat-based billing formula:
 *   Morning amount = morning_liter × morning_fat × rate
 *   Evening amount = evening_liter × evening_fat × rate
 *   Day total      = morning amount + evening amount
 *
 * NOTE: If fat values are stored as % (e.g. 4.5 meaning 4.5%),
 * divide by 100. If already as decimal (0.045), remove the /100.
 */
const calculateBill = (entries, rate) => {
  let totalMorningLiter = 0;
  let totalEveningLiter = 0;
  let totalMorningFat = 0;
  let totalEveningFat = 0;
  let totalAmount = 0;

  const rows = entries.map((entry) => {
    const mLiter = entry.morning_liter || 0;
    const mFat   = entry.morning_fat   || 0;
    const eLiter = entry.evening_liter || 0;
    const eFat   = entry.evening_fat   || 0;

    const morningAmount = mLiter * mFat * rate;
    const eveningAmount = eLiter * eFat * rate;
    const dayTotal      = morningAmount + eveningAmount;

    totalMorningLiter += mLiter;
    totalEveningLiter += eLiter;
    totalMorningFat   += mFat;
    totalEveningFat   += eFat;
    totalAmount       += dayTotal;

    return {
      date:          entry.date,
      mLiter,  mFat,  morningAmount,
      eLiter,  eFat,  eveningAmount,
      dayTotal,
    };
  });

  const totalDays = rows.filter(r => r.mLiter > 0 || r.eLiter > 0).length;
  return {
    rows,
    totalMorningLiter,
    totalEveningLiter,
    totalLiter: totalMorningLiter + totalEveningLiter,
    totalMorningFat,
    totalEveningFat,
    totalFat: totalMorningFat + totalEveningFat,
    totalAmount,
    totalDays,
  };
};

// ─── Build Bill HTML for PDF ─────────────────────────────────────────────────

const buildBillHTML = (customer, month, year, rate, bill, logoBase64 = '') => {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const activeRows = bill.rows.filter(r => r.mLiter > 0 || r.eLiter > 0);

  const rows = activeRows.map(r => `
    <tr>
      <td>${parseInt(r.date.slice(8), 10)}</td>
      <td>${r.mLiter}</td>
      <td>${r.mFat}</td>
      <td>${r.eLiter}</td>
      <td>${r.eFat}</td>
      <td class="amt">₹${r.dayTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        @page { margin: 8mm; size: A4 portrait; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #1B1B1B; }

        /* Header */
        .header { background: #2E7D32; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 8px; }
        .logo { width: 36px; height: 36px; border-radius: 6px; background: white; padding: 3px; object-fit: contain; }
        .logo-placeholder { width: 36px; height: 36px; font-size: 24px; display: flex; align-items: center; justify-content: center; }
        .app-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
        .bill-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
        .header-right { text-align: right; }
        .customer-name { font-size: 13px; font-weight: 800; }
        .header-right p { font-size: 9px; opacity: 0.85; margin-top: 2px; }

        /* Summary cards */
        .summary { display: flex; gap: 6px; margin-bottom: 8px; }
        .card { flex: 1; border: 1px solid #A5D6A7; background: #E8F5E9; border-radius: 5px; padding: 5px 4px; text-align: center; }
        .card .label { font-size: 7px; color: #2E7D32; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
        .card .value { font-size: 11px; font-weight: 800; color: #2E7D32; margin-top: 2px; }

        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th { background: #1B1B1B; color: white; padding: 4px 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
        td { padding: 3px; border-bottom: 1px solid #F0F0F0; text-align: center; font-size: 8px; }
        tr:nth-child(even) td { background: #FAFAFA; }
        .amt { text-align: right; color: #2E7D32; font-weight: 700; padding-right: 4px; }
        .footer-row td { background: #E8F5E9 !important; font-weight: 800; color: #2E7D32; border-top: 1.5px solid #A5D6A7; font-size: 9px; }
        .title-col { text-align: left; padding-left: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="logo" />` : '<div class="logo-placeholder">🥛</div>'}
          <div>
            <div class="app-name">MilkBook</div>
            <div class="bill-label">Monthly Bill</div>
          </div>
        </div>
        <div class="header-right">
          <div class="customer-name">${customer.name}</div>
          <p>${monthName} ${year}</p>
          ${customer.phone ? `<p>📞 ${customer.phone}</p>` : ''}
        </div>
      </div>

      <div class="summary">
        <div class="card"><div class="label">Rate/Fat</div><div class="value">₹${rate}</div></div>
        <div class="card"><div class="label">M.Liters</div><div class="value">${bill.totalMorningLiter.toFixed(1)}</div></div>
        <div class="card"><div class="label">E.Liters</div><div class="value">${bill.totalEveningLiter.toFixed(1)}</div></div>
        <div class="card"><div class="label">Total Liters</div><div class="value">${bill.totalLiter.toFixed(1)}</div></div>
        <div class="card"><div class="label">Total Fat</div><div class="value">${bill.totalFat.toFixed(1)}</div></div>
        <div class="card"><div class="label">Total Amount</div><div class="value">₹${bill.totalAmount.toFixed(0)}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Day</th><th>M.Lt</th><th>M.Fat</th><th>E.Lt</th><th>E.Fat</th><th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="footer-row">
            <td class="title-col">TOTAL</td>
            <td>${bill.totalMorningLiter.toFixed(1)}</td>
            <td>${bill.totalMorningFat.toFixed(1)}</td>
            <td>${bill.totalEveningLiter.toFixed(1)}</td>
            <td>${bill.totalEveningFat.toFixed(1)}</td>
            <td class="amt">₹${bill.totalAmount.toFixed(0)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
};

// ─── Month/Year Picker ────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Component ────────────────────────────────────────────────────────────────

const BillScreen = ({ route, navigation }) => {
  const { customer, month: initMonth, year: initYear } = route.params;
  const user  = useSelector(selectUser);

  const today     = new Date();
  const [month, setMonth] = useState(initMonth || today.getMonth() + 1);
  const [year,  setYear]  = useState(initYear  || today.getFullYear());
  const [bill,  setBill]  = useState(null);
  const [rate,  setRate]  = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Load & calculate ──────────────────────────────────────────────────────

  const load = useCallback(() => {
    setLoading(true);
    try {
      const r       = getCustomerRate(user.id, customer.id, month, year);
      const data    = getMilkEntriesByCustomer(user.id, customer.id, month, year);

      // Build full month grid — every day 1 to end of month
      const daysInMonth = new Date(year, month, 0).getDate();
      const entryMap = {};
      data.forEach(item => (entryMap[item.date] = item));

      const fullMonth = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        fullMonth.push(entryMap[dateStr] || {
          id: `empty-${dateStr}`,
          date: dateStr,
          morning_liter: 0, morning_fat: 0,
          evening_liter: 0, evening_fat: 0,
        });
      }

      const result = calculateBill(fullMonth, r);
      setRate(r);
      setBill(result);
    } catch (e) {
      console.log('BillScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user.id, customer.id, month, year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: `${MONTHS[month - 1]} ${year} — Bill` });
  }, [month, year]);

  // ── Share ──────────────────────────────────────────────────────────────────

  // Opens Android print dialog — tap "Save as PDF" to get a PDF, then share from Files
  const handleShare = async () => {
    if (!bill) return;
    try {
      const html = buildBillHTML(customer, month, year, rate, bill, LOGO_BASE64);
      await RNPrint.print({ html });
    } catch (e) {
      console.log('Print error:', e.message || e);
      Alert.alert('Error', 'Could not open print dialog');
    }
  };

  // ── Month navigation ───────────────────────────────────────────────────────

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeRows = bill?.rows || [];

  return (
    <View style={s.screen}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>Monthly Bill</Text>
          <Text style={s.headerName}>{customer.name}</Text>
          {customer.phone ? <Text style={s.headerPhone}>{customer.phone}</Text> : null}
        </View>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Text style={s.shareBtnText}>Save PDF</Text>
        </TouchableOpacity>
      </View>

      {/* ── Month picker ── */}
      <View style={s.monthPicker}>
        <TouchableOpacity onPress={prevMonth} style={s.monthArrow}>
          <Text style={s.monthArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.monthArrow}>
          <Text style={s.monthArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Rate & summary ── */}
      {bill && (
        <View style={s.summaryGrid}>
          <View style={s.summaryGridRow}>
            <SummaryCard label="Rate / Fat" value={formatINR(rate)} accent />
            <SummaryCard label="Total Amount" value={formatINR(bill.totalAmount)} accent />
          </View>
          <View style={s.summaryGridRow}>
            <SummaryCard label="Total Liters" value={`${bill.totalLiter.toFixed(2)} L`} />
            <SummaryCard label="Total Fat" value={bill.totalFat.toFixed(2)} />
          </View>
          <View style={s.summaryGridRow}>
            <SummaryCard label="Total Days" value={`${bill.totalDays} days`} />
          </View>
        </View>
      )}

      {/* ── Sub totals ── */}
      {bill && (
        <View style={s.subRow}>
          <View style={s.subCard}>
            <Text style={s.subIcon}>🌅</Text>
            <View>
              <Text style={s.subLabel}>Morning</Text>
              <Text style={s.subVal}>{bill.totalMorningLiter.toFixed(2)} L</Text>
              <Text style={s.subVal}>{bill.totalMorningFat.toFixed(2)} F</Text>
            </View>
          </View>
          <View style={s.subDivider} />
          <View style={s.subCard}>
            <Text style={s.subIcon}>🌇</Text>
            <View>
              <Text style={s.subLabel}>Evening</Text>
              <Text style={s.subVal}>{bill.totalEveningLiter.toFixed(2)} L</Text>
              <Text style={s.subVal}>{bill.totalEveningFat.toFixed(2)} F</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Table ── */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E7D32" />
      ) : (
        <ScrollView style={s.tableWrap} showsVerticalScrollIndicator={false}>
          {/* Table header */}
          <View style={[s.tableRow, s.tableHead]}>
            <Text style={[s.cell, s.cellDate, s.headText]}>Date</Text>
            <Text style={[s.cell, s.cellNum,  s.headText]}>M.Lt</Text>
            <Text style={[s.cell, s.cellNum,  s.headText]}>M.Fat</Text>
            <Text style={[s.cell, s.cellNum,  s.headText]}>E.Lt</Text>
            <Text style={[s.cell, s.cellNum,  s.headText]}>E.Fat</Text>
            <Text style={[s.cell, s.cellAmt,  s.headText]}>₹</Text>
          </View>

          {activeRows.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No milk entries for this month</Text>
            </View>
          ) : (
            activeRows.map((row, i) => (
              <View key={row.date} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                <Text style={[s.cell, s.cellDate]}>{parseInt(row.date.slice(8), 10)}</Text>
                <Text style={[s.cell, s.cellNum]}>{row.mLiter > 0 ? row.mLiter : '—'}</Text>
                <Text style={[s.cell, s.cellNum]}>{row.mFat  > 0 ? row.mFat   : '—'}</Text>
                <Text style={[s.cell, s.cellNum]}>{row.eLiter > 0 ? row.eLiter : '—'}</Text>
                <Text style={[s.cell, s.cellNum]}>{row.eFat  > 0 ? row.eFat   : '—'}</Text>
                <Text style={[s.cell, s.cellAmt, s.amtText]}>
                  {row.dayTotal > 0 ? formatINR(row.dayTotal) : '—'}
                </Text>
              </View>
            ))
          )}

          {/* Total footer row */}
          {bill && activeRows.length > 0 && (
            <View style={[s.tableRow, s.tableFooter]}>
              <Text style={[s.cell, s.cellDate, s.footText]}>TOTAL</Text>
              <Text style={[s.cell, s.cellNum,  s.footText]}>{bill.totalMorningLiter.toFixed(1)}</Text>
              <Text style={[s.cell, s.cellNum,  s.footText]}>{bill.totalMorningFat.toFixed(1)}</Text>
              <Text style={[s.cell, s.cellNum,  s.footText]}>{bill.totalEveningLiter.toFixed(1)}</Text>
              <Text style={[s.cell, s.cellNum,  s.footText]}>{bill.totalEveningFat.toFixed(1)}</Text>
              <Text style={[s.cell, s.cellAmt,  s.footText]}>{formatINR(bill.totalAmount)}</Text>
            </View>
          )}

          <View style={{ height: 16 }} />

          {/* ── Chart ── */}
          {bill && bill.rows.length > 0 && (
            <CombinedChart rows={bill.rows} />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};


// ─── Line Chart Component ─────────────────────────────────────────────────────

// ─── Reusable mini chart ─────────────────────────────────────────────────────

const MiniLineChart = ({ title, lines }) => {
  // lines = [{ label, color, values: [{ day, val }] }, ...]
  const WIDTH = 340, HEIGHT = 150;
  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const chartW = WIDTH - PAD_L - PAD_R;
  const chartH = HEIGHT - PAD_T - PAD_B;

  const allDays = lines[0]?.values.map(v => v.day) || [];
  const allVals = lines.flatMap(l => l.values.map(v => v.val));
  const maxVal  = Math.max(...allVals, 1);
  const minDay  = Math.min(...allDays, 1);
  const maxDay  = Math.max(...allDays, minDay + 1);

  const xScale = d => PAD_L + ((d - minDay) / (maxDay - minDay)) * chartW;
  const yScale = v => PAD_T + chartH - (v / maxVal) * chartH;
  const toPoints = vals => vals.map(v => `${xScale(v.day)},${yScale(v.val)}`).join(' ');

  const yLabels = [0, parseFloat((maxVal / 2).toFixed(1)), parseFloat(maxVal.toFixed(1))];

  return (
    <View style={s.chartWrap}>
      <Text style={s.chartTitle}>{title}</Text>
      <Svg width={WIDTH} height={HEIGHT}>
        {/* Grid */}
        {yLabels.map((v, i) => (
          <Line key={i} x1={PAD_L} y1={yScale(v)} x2={WIDTH - PAD_R} y2={yScale(v)}
            stroke="#E0E0E0" strokeWidth="1" strokeDasharray="4,3" />
        ))}
        {/* Y labels */}
        {yLabels.map((v, i) => (
          <SvgText key={i} x={PAD_L - 4} y={yScale(v) + 4}
            fontSize="9" fill="#999" textAnchor="end">{v}</SvgText>
        ))}
        {/* X labels */}
        {allDays.map((d, i) => {
          if (i % Math.ceil(allDays.length / 6) !== 0) return null;
          return <SvgText key={i} x={xScale(d)} y={HEIGHT - 6}
            fontSize="9" fill="#999" textAnchor="middle">{d}</SvgText>;
        })}
        {/* Lines + dots */}
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            <Polyline points={toPoints(line.values)} fill="none"
              stroke={line.color} strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
            {line.values.map((v, i) => (
              <Circle key={i} cx={xScale(v.day)} cy={yScale(v.val)}
                r="3" fill={line.color} />
            ))}
          </React.Fragment>
        ))}
      </Svg>
      {/* Legend */}
      <View style={s.chartLegend}>
        {lines.map((line, i) => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: line.color }]} />
            <Text style={s.legendText}>{line.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const CombinedChart = ({ rows }) => {
  const active = rows;
  if (!active || active.length === 0) return null;

  const toDay   = r => parseInt(r.date.slice(8), 10);
  const toLiter = r => (r.mLiter || 0) + (r.eLiter || 0);
  const toFat   = r => (r.mFat   || 0) + (r.eFat   || 0);

  // Only plot days that have data
  const literVals = active.filter(r => toLiter(r) > 0).map(r => ({ day: toDay(r), val: parseFloat(toLiter(r).toFixed(2)) }));
  const fatVals   = active.filter(r => toFat(r)   > 0).map(r => ({ day: toDay(r), val: parseFloat(toFat(r).toFixed(2))   }));

  if (literVals.length === 0 && fatVals.length === 0) return null;

  const WIDTH = 340, HEIGHT = 180;
  const PAD_L = 36, PAD_R = 36, PAD_T = 12, PAD_B = 28;
  const chartW = WIDTH - PAD_L - PAD_R;
  const chartH = HEIGHT - PAD_T - PAD_B;

  const allDays  = active.map(toDay);
  const minDay   = Math.min(...allDays);
  const maxDay   = Math.max(...allDays, minDay + 1);
  const maxLiter = Math.max(...literVals.map(v => v.val), 1);
  const maxFat   = Math.max(...fatVals.map(v => v.val),   1);

  const xScale = d => PAD_L + ((d - minDay) / (maxDay - minDay)) * chartW;
  const yL     = v => PAD_T + chartH - (v / maxLiter) * chartH;
  const yF     = v => PAD_T + chartH - (v / maxFat)   * chartH;
  const pts    = (vals, yFn) => vals.map(v => `${xScale(v.day)},${yFn(v.val)}`).join(' ');

  const yLLabels = [0, parseFloat((maxLiter / 2).toFixed(1)), parseFloat(maxLiter.toFixed(1))];
  const yFLabels = [0, parseFloat((maxFat   / 2).toFixed(1)), parseFloat(maxFat.toFixed(1))];

  return (
    <View style={s.chartWrap}>
      <Text style={s.chartTitle}>📊 Daily Liters & Fat</Text>
      <Svg width={WIDTH} height={HEIGHT}>
        {/* Grid */}
        {yLLabels.map((v, i) => (
          <Line key={i} x1={PAD_L} y1={yL(v)} x2={WIDTH - PAD_R} y2={yL(v)}
            stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4,3" />
        ))}
        {/* Left Y — Liters */}
        {yLLabels.map((v, i) => (
          <SvgText key={i} x={PAD_L - 4} y={yL(v) + 4}
            fontSize="9" fill="#2E7D32" textAnchor="end">{v}L</SvgText>
        ))}
        {/* Right Y — Fat */}
        {yFLabels.map((v, i) => (
          <SvgText key={i} x={WIDTH - PAD_R + 4} y={yF(v) + 4}
            fontSize="9" fill="#E65100" textAnchor="start">{v}F</SvgText>
        ))}
        {/* X axis — show every ~5 days */}
        {allDays.map((d, i) => {
          if (i % Math.ceil(allDays.length / 6) !== 0) return null;
          return <SvgText key={i} x={xScale(d)} y={HEIGHT - 6}
            fontSize="9" fill="#999" textAnchor="middle">{d}</SvgText>;
        })}
        {/* Liter line — only through data points */}
        {literVals.length > 1 && <Polyline points={pts(literVals, yL)} fill="none"
          stroke="#2E7D32" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {/* Fat line — only through data points */}
        {fatVals.length > 1 && <Polyline points={pts(fatVals, yF)} fill="none"
          stroke="#E65100" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray="6,3" />}
        {/* Dots only on data days */}
        {literVals.map((v, i) => <Circle key={`l${i}`} cx={xScale(v.day)} cy={yL(v.val)} r="3" fill="#2E7D32" />)}
        {fatVals.map((v,   i) => <Circle key={`f${i}`} cx={xScale(v.day)} cy={yF(v.val)} r="3" fill="#E65100" />)}
      </Svg>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#2E7D32' }]} />
          <Text style={s.legendText}>Total Liters</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#E65100' }]} />
          <Text style={s.legendText}>Total Fat</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, accent }) => (
  <View style={[s.card, accent && s.cardAccent]}>
    <Text style={[s.cardLabel, accent && s.cardLabelAccent]}>{label}</Text>
    <Text style={[s.cardValue, accent && s.cardValueAccent]}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const GREEN      = '#2E7D32';
const GREEN_LIGHT= '#E8F5E9';
const GREEN_MID  = '#A5D6A7';
const DARK       = '#1B1B1B';
const GRAY       = '#757575';
const BG         = '#F9FBF9';
const WHITE      = '#FFFFFF';

const s = StyleSheet.create({
  // ── Screen
  screen: { flex: 1, backgroundColor: BG },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: GREEN,
  },
  headerLabel: {
    fontSize: 11,
    color: GREEN_MID,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerName: { fontSize: 20, color: WHITE, fontWeight: '800' },
  headerPhone: { fontSize: 12, color: GREEN_MID, marginTop: 2 },
  shareBtn: {
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareBtnText: { color: GREEN, fontWeight: '700', fontSize: 13 },

  // ── Month picker
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  monthArrow: { paddingHorizontal: 20, paddingVertical: 6 },
  monthArrowText: { fontSize: 28, color: GREEN, fontWeight: '300', lineHeight: 32 },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    minWidth: 160,
    textAlign: 'center',
  },

  // ── Summary grid
  summaryRow: { flexDirection: 'row', padding: 12, gap: 8 },
  summaryGrid: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8 },
  summaryGridRow: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardAccent: { backgroundColor: GREEN_LIGHT, borderColor: GREEN_MID },
  cardLabel: {
    fontSize: 9,
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardLabelAccent: { color: GREEN },
  cardValue: { fontSize: 15, fontWeight: '800', color: DARK, marginTop: 3 },
  cardValueAccent: { color: GREEN },

  // ── Sub totals
  subRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  subCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  subIcon: { fontSize: 22 },
  subLabel: {
    fontSize: 10,
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 3,
  },
  subVal: { fontSize: 13, color: DARK, fontWeight: '700', lineHeight: 18 },
  subDivider: { width: 1, backgroundColor: '#E0E0E0', alignSelf: 'stretch' },
  subText: { fontSize: 12, color: GRAY, fontWeight: '500' },

  // ── Table
  tableWrap: { flex: 1, marginHorizontal: 12, marginTop: 4 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHead: {
    backgroundColor: DARK,
    borderRadius: 8,
    marginBottom: 2,
    paddingVertical: 9,
    borderBottomWidth: 0,
  },
  tableFooter: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 8,
    marginTop: 4,
    borderBottomWidth: 0,
    paddingVertical: 9,
  },

  // ── Cells
  cell: { fontSize: 12, color: DARK },
  cellDate: { width: 30, paddingLeft: 6, fontWeight: '700', textAlign: 'center' },
  cellNum: { flex: 1.2, textAlign: 'center' },
  cellAmt: { flex: 1.8, textAlign: 'right', paddingRight: 8 },
  headText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amtText: { color: GREEN, fontWeight: '700' },
  footText: { color: GREEN, fontWeight: '800' },

  // ── Chart
  chartWrap: {
    marginHorizontal: 4,
    marginTop: 8,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 8 },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: GRAY },

  // ── Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: GRAY, fontSize: 14 },
});

export default BillScreen;