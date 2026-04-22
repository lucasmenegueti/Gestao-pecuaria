import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface Option {
  value: string;
  label: string;
  description?: string;
  /** Cor de tint do ChoiceCard quando selecionado — usada no radio externo. */
  color?: string;
  icon?: string;
}

interface MultiChoiceProps {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
}

export function MultiChoice({ options, value, onChange }: MultiChoiceProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const tint = option.color ?? NSA.green800;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isSelected && { borderColor: tint, borderWidth: 1.5, backgroundColor: NSA.green50 },
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.85}
          >
            {option.icon && (
              <View style={[styles.iconWrap, { backgroundColor: isSelected ? NSA.bgElevated : NSA.bgMuted }]}>
                <Text style={styles.icon}>{option.icon}</Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={[styles.label, isSelected && { color: tint }]}>{option.label}</Text>
              {option.description && (
                <Text style={styles.description}>
                  {option.description}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.radio,
                isSelected && { borderColor: tint, borderWidth: 5 },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: NSA.border,
    backgroundColor: NSA.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  textContainer: { flex: 1 },
  label: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
  },
  description: {
    fontSize: 12,
    color: NSA.inkSecondary,
    marginTop: 2,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: NSA.borderStrong,
    backgroundColor: NSA.bgElevated,
  },
});
