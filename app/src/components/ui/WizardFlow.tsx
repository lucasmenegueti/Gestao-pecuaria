import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WizardFlowProps {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  accentColor?: string;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

export function WizardFlow({
  title,
  subtitle,
  step,
  totalSteps,
  accentColor = '#1a6b54',
  onBack,
  onNext,
  nextLabel = 'AVANÇAR',
  nextDisabled,
  children,
}: WizardFlowProps) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Step Indicator */}
      <View style={styles.stepBar}>
        <Text style={styles.stepText}>Passo {step} de {totalSteps}</Text>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < step ? { backgroundColor: accentColor } : { backgroundColor: '#e0dcd5' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {children}
      </ScrollView>

      {/* Footer */}
      {onNext && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: accentColor }, nextDisabled && styles.disabled]}
            onPress={onNext}
            disabled={nextDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.nextText}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f1ec',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  backText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dcd5',
  },
  stepText: {
    fontSize: 14,
    color: '#7a7a7a',
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0dcd5',
  },
  nextButton: {
    minHeight: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
