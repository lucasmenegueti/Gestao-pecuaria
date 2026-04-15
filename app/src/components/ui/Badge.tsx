import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'ok' | 'warning' | 'danger' | 'info' | 'muted';
}

const BADGE_COLORS = {
  ok: { bg: '#e8f5e9', text: '#2d8a4e' },
  warning: { bg: '#fff3e0', text: '#e67e22' },
  danger: { bg: '#fce4ec', text: '#c0392b' },
  info: { bg: '#e3f2fd', text: '#2980b9' },
  muted: { bg: '#f5f5f5', text: '#7a7a7a' },
};

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const colors = BADGE_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
