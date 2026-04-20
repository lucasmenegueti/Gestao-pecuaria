import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface ResultCardProps {
  icon?: string;
  value: string;
  label: string;
  sublabel?: string;
  /** Cor do card — mantida por compat; agora usa como borda lateral + tint do número. */
  color: string;
}

export function ResultCard({ icon, value, label, sublabel, color }: ResultCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderLeftWidth: 3,
    borderRadius: Radius.xl,
    padding: 16,
    marginVertical: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  icon: {
    fontSize: 22,
  },
  value: {
    fontSize: 32,
    fontFamily: Fonts.loraSemibold,
    letterSpacing: -0.5,
  },
  sublabel: {
    fontSize: 12,
    color: NSA.inkSecondary,
    marginTop: 4,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
});
