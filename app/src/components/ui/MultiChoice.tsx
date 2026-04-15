import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Option {
  value: string;
  label: string;
  description?: string;
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
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isSelected && { backgroundColor: option.color || '#1a6b54', borderColor: option.color || '#1a6b54' },
              !isSelected && option.color ? { borderColor: option.color } : undefined,
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            {option.icon && <Text style={styles.icon}>{option.icon}</Text>}
            <View style={styles.textContainer}>
              <Text style={[styles.label, isSelected && styles.selectedText]}>{option.label}</Text>
              {option.description && (
                <Text style={[styles.description, isSelected && styles.selectedDescription]}>
                  {option.description}
                </Text>
              )}
            </View>
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
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0dcd5',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2c2c',
  },
  description: {
    fontSize: 14,
    color: '#7a7a7a',
    marginTop: 2,
  },
  selectedText: {
    color: '#ffffff',
  },
  selectedDescription: {
    color: 'rgba(255,255,255,0.8)',
  },
});
