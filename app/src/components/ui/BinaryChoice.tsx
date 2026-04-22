import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface BinaryChoiceProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}

export function BinaryChoice({ value, onChange, yesLabel = 'Sim', noLabel = 'Não' }: BinaryChoiceProps) {
  const yesSelected = value === true;
  const noSelected = value === false;
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: yesSelected ? NSA.ok : NSA.border, backgroundColor: yesSelected ? NSA.okBg : NSA.bgElevated },
        ]}
        onPress={() => onChange(true)}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrap, { backgroundColor: yesSelected ? NSA.ok : NSA.bgMuted }]}>
          <Check size={20} color={yesSelected ? NSA.cream : NSA.inkSecondary} strokeWidth={2.5} />
        </View>
        <Text style={[styles.text, { color: yesSelected ? NSA.okFg : NSA.inkPrimary }]}>{yesLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: noSelected ? NSA.danger : NSA.border, backgroundColor: noSelected ? NSA.dangerBg : NSA.bgElevated },
        ]}
        onPress={() => onChange(false)}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrap, { backgroundColor: noSelected ? NSA.danger : NSA.bgMuted }]}>
          <X size={20} color={noSelected ? NSA.cream : NSA.inkSecondary} strokeWidth={2.5} />
        </View>
        <Text style={[styles.text, { color: noSelected ? NSA.dangerFg : NSA.inkPrimary }]}>{noLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    minHeight: 96,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 10,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.15,
  },
});
