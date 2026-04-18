import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderColor?: string;
}

export function Card({ children, style, onPress, borderColor }: CardProps) {
  const content = (
    <View style={[styles.card, borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : undefined, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2c2c',
    marginBottom: 8,
  },
});
