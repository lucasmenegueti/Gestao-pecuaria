import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

export type StatusKind = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const PAL: Record<StatusKind, { bg: string; fg: string; dot: string }> = {
  ok: { bg: NSA.okBg, fg: NSA.okFg, dot: NSA.ok },
  warn: { bg: NSA.warnBg, fg: NSA.warnFg, dot: NSA.warn },
  danger: { bg: NSA.dangerBg, fg: NSA.dangerFg, dot: NSA.danger },
  info: { bg: NSA.infoBg, fg: NSA.infoFg, dot: NSA.info },
  neutral: { bg: NSA.grey100, fg: NSA.inkSecondary, dot: NSA.inkDisabled },
};

export function StatusPill({
  kind,
  children,
  size = 'md',
}: {
  kind: StatusKind;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const p = PAL[kind];
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]}>
      <View style={[styles.dot, { backgroundColor: p.dot }]} />
      <Text style={[styles.label, { color: p.fg, fontSize: size === 'sm' ? 10 : 11 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontFamily: Fonts.medium },
});
