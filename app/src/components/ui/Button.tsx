import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

const VARIANTS: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: NSA.green800, text: NSA.cream },
  secondary: { bg: NSA.cream, text: NSA.green800, border: NSA.green800 },
  success: { bg: NSA.ok, text: NSA.cream },
  danger: { bg: NSA.danger, text: NSA.cream },
  warning: { bg: NSA.warn, text: NSA.cream },
  outline: { bg: NSA.grey0, text: NSA.inkPrimary, border: NSA.borderStrong },
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: keyof typeof VARIANTS;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Texto/emoji mantido por compat — código legado usa icon como string. */
  icon?: string;
  size?: 'normal' | 'large';
}

export function Button({ title, onPress, variant = 'primary', disabled, style, icon, size = 'normal' }: ButtonProps) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : undefined,
        size === 'large' && styles.buttonLarge,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: v.text }, size === 'large' && styles.textLarge]}>
        {icon ? `${icon}  ${title}` : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonLarge: {
    minHeight: 64,
    paddingVertical: 16,
  },
  text: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.15,
  },
  textLarge: {
    fontSize: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});
