import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

const COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: '#1a6b54', text: '#ffffff' },
  secondary: { bg: '#e8f5f0', text: '#1a6b54' },
  success: { bg: '#2d8a4e', text: '#ffffff' },
  danger: { bg: '#c0392b', text: '#ffffff' },
  warning: { bg: '#e67e22', text: '#ffffff' },
  outline: { bg: 'transparent', text: '#1a6b54', border: '#1a6b54' },
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: keyof typeof COLORS;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
  size?: 'normal' | 'large';
}

export function Button({ title, onPress, variant = 'primary', disabled, style, icon, size = 'normal' }: ButtonProps) {
  const colors = COLORS[variant] || COLORS.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        { backgroundColor: colors.bg },
        colors.border ? { borderWidth: 2, borderColor: colors.border } : undefined,
        size === 'large' && styles.buttonLarge,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.text }, size === 'large' && styles.textLarge]}>
        {icon ? `${icon}  ${title}` : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonLarge: {
    minHeight: 72,
    paddingVertical: 18,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 22,
  },
  disabled: {
    opacity: 0.5,
  },
});
