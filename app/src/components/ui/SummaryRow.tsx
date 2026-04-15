import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    borderBottomColor: '#f0ede8',
  },
  label: {
    fontSize: 16,
    color: '#7a7a7a',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2c2c',
  },
});
