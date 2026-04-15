import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface BinaryChoiceProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}

export function BinaryChoice({ value, onChange, yesLabel = 'SIM', noLabel = 'NÃO' }: BinaryChoiceProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.yesButton, value === true && styles.yesSelected]}
        onPress={() => onChange(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, value === true && styles.selectedText]}>{yesLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.noButton, value === false && styles.noSelected]}
        onPress={() => onChange(false)}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, value === false && styles.selectedText]}>{noLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  yesButton: {
    borderColor: '#2d8a4e',
    backgroundColor: '#e8f5e9',
  },
  noButton: {
    borderColor: '#c0392b',
    backgroundColor: '#fce4ec',
  },
  yesSelected: {
    backgroundColor: '#2d8a4e',
  },
  noSelected: {
    backgroundColor: '#c0392b',
  },
  text: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c2c2c',
  },
  selectedText: {
    color: '#ffffff',
  },
});
