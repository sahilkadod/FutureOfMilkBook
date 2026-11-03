import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from './src/theme/tokens';

function MetricCard({label, value, hint}: {label: string; value: string; hint: string}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>DAIRY MANAGEMENT</Text>
            <Text style={styles.title}>Good day 👋</Text>
            <Text style={styles.subtitle}>Your dairy at a glance</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>FM</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>FUTURE OF MILKBOOK</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Offline ready</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>A simpler way to{ '\n' }manage your dairy.</Text>
          <Text style={styles.heroDescription}>
            Customer records, milk entries and clear billing — together in one place.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionMeta}>Today</Text>
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard label="Customers" value="—" hint="Connect your data" />
          <MetricCard label="Milk collected" value="— L" hint="Morning + evening" />
          <MetricCard label="Total fat" value="—" hint="Daily total" />
          <MetricCard label="Milk amount" value="₹ —" hint="Based on saved rate" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.actionCard}>
          <View style={styles.actionIcon}><Text style={styles.actionEmoji}>＋</Text></View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Add milk entry</Text>
            <Text style={styles.actionDescription}>Record morning or evening milk</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </View>
        <View style={styles.actionCard}>
          <View style={[styles.actionIcon, styles.actionIconAlt]}><Text style={styles.actionEmoji}>♙</Text></View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Manage customers</Text>
            <Text style={styles.actionDescription}>Customer details and monthly history</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </View>

        <Text style={styles.footer}>FOUNDATION BUILD · DATA NOT CONNECTED YET</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: spacing.xxl},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg},
  eyebrow: {fontSize: 10, letterSpacing: 1.5, fontWeight: '800', color: colors.primary},
  title: {fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.text, marginTop: 5},
  subtitle: {fontSize: 14, color: colors.textMuted, marginTop: 3},
  avatar: {width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontWeight: '800', color: colors.primaryDark},
  heroCard: {backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl},
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroEyebrow: {fontSize: 10, letterSpacing: 1.2, color: '#BCE4C9', fontWeight: '800'},
  statusPill: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6},
  statusDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#8DE0A9', marginRight: 6},
  statusText: {fontSize: 10, color: '#FFFFFF', fontWeight: '700'},
  heroTitle: {fontSize: 27, lineHeight: 33, color: '#FFFFFF', fontWeight: '800', marginTop: spacing.lg},
  heroDescription: {fontSize: 13, lineHeight: 20, color: '#D5EBDD', marginTop: 10, maxWidth: 280},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  sectionTitle: {fontSize: 18, fontWeight: '800', color: colors.text},
  sectionMeta: {fontSize: 12, fontWeight: '700', color: colors.primary},
  metricsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xl},
  metricCard: {width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: 12},
  metricLabel: {fontSize: 12, color: colors.textMuted, fontWeight: '600'},
  metricValue: {fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 10},
  metricHint: {fontSize: 10, color: colors.textMuted, marginTop: 4},
  actionCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: 10},
  actionIcon: {width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center'},
  actionIconAlt: {backgroundColor: '#E9EFFB'},
  actionEmoji: {fontSize: 23, fontWeight: '700', color: colors.primary},
  actionCopy: {flex: 1, marginLeft: 12},
  actionTitle: {fontSize: 14, fontWeight: '800', color: colors.text},
  actionDescription: {fontSize: 11, color: colors.textMuted, marginTop: 3},
  actionArrow: {fontSize: 26, color: colors.textMuted, paddingLeft: 8},
  footer: {textAlign: 'center', fontSize: 9, letterSpacing: 1, color: colors.textMuted, marginTop: spacing.xl},
});
