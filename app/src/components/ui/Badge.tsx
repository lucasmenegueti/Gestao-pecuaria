import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NSA, Fonts } from '@/theme/nsa';

interface BadgeProps {
  label: string;
  variant?: 'ok' | 'warning' | 'danger' | 'info' | 'muted';
}

const BADGE_COLORS = {
  ok: { bg: NSA.okBg, text: NSA.okFg },
  warning: { bg: NSA.warnBg, text: NSA.warnFg },
  danger: { bg: NSA.dangerBg, text: NSA.dangerFg },
  info: { bg: NSA.infoBg, text: NSA.infoFg },
  muted: { bg: NSA.grey100, text: NSA.inkSecondary },
} as const;

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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0,
  },
});
