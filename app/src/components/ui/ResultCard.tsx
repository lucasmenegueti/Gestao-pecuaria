import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ResultCardProps {
  icon?: string;
  value: string;
  label: string;
  sublabel?: string;
  color: string;
}

export function ResultCard({ icon, value, label, sublabel, color }: ResultCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  value: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  sublabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
});
