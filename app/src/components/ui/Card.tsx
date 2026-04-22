import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderColor?: string;
}

export function Card({ children, style, onPress, borderColor }: CardProps) {
  const content = (
    <View style={[styles.card, borderColor ? { borderLeftWidth: 3, borderLeftColor: borderColor } : undefined, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

interface CardTitleProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ children, style }: CardTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NSA.bgElevated,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: NSA.border,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
    marginBottom: 8,
  },
});
