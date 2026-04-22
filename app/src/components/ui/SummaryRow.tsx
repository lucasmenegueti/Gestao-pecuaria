import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NSA, Fonts } from '@/theme/nsa';

interface SummaryRowProps {
  label: string;
  value: string;
  icon?: string;
  valueColor?: string;
}

export function SummaryRow({ label, value, icon, valueColor }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]}>
        {icon ? `${icon} ${value}` : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: NSA.borderSubtle,
  },
  label: {
    fontSize: 13,
    color: NSA.inkSecondary,
    fontFamily: Fonts.regular,
  },
  value: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.1,
  },
});
