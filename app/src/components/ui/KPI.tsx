import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { NSA, Fonts, Radius, tokensForStatus, StatusTone } from '@/theme/nsa';

export function KPI({
  label,
  value,
  unit,
  hint,
  tone = 'default',
  style,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
}) {
  const color = tone === 'default' ? NSA.inkPrimary : tokensForStatus(tone).edge;
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressBar({ pct, tone = 'default' }: { pct: number; tone?: StatusTone }) {
  const color = tone === 'default' ? NSA.green800 : tokensForStatus(tone).edge;
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${safePct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 14,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    fontFamily: Fonts.medium,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  value: {
    fontFamily: Fonts.loraSemibold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    color: NSA.inkSecondary,
    fontFamily: Fonts.medium,
  },
  hint: {
    fontSize: 11,
    color: NSA.inkMuted,
    marginTop: 3,
    fontFamily: Fonts.regular,
  },
  barTrack: {
    height: 6,
    backgroundColor: NSA.bgMuted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
});
