import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { NSA, Fonts, Radius } from '@/theme/nsa';
import { useSafeBack } from '@/hooks/use-safe-back';

interface WizardFlowProps {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  /** Cor de destaque mantida pra compat com wizards existentes — usada como dot do domain no header. */
  accentColor?: string;
  onBack: () => void;
  /** Rota de fallback caso a stack esteja vazia. */
  fallback?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextVariant?: 'primary' | 'success';
  children: React.ReactNode;
}

export function WizardFlow({
  title,
  subtitle,
  step,
  totalSteps,
  accentColor = NSA.cream,
  onBack,
  fallback,
  onNext,
  nextLabel = 'Avançar',
  nextDisabled,
  nextVariant = 'primary',
  children,
}: WizardFlowProps) {
  const insets = useSafeAreaInsets();
  const safeBack = useSafeBack(onBack, fallback);
  const pct = Math.max(0, Math.min(100, (step / totalSteps) * 100));
  const nextBg = nextVariant === 'success' ? NSA.ok : NSA.green800;
  return (
    <View style={styles.root}>
      {/* Header verde profundo */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={safeBack} style={styles.backButton} hitSlop={10}>
            <ChevronLeft size={14} color={NSA.cream} strokeWidth={2} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.stepCounter}>{step} / {totalSteps}</Text>
        </View>
        <View style={styles.contextRow}>
          <View style={[styles.contextDot, { backgroundColor: accentColor }]} />
          <Text style={styles.contextLabel} numberOfLines={1}>
            {subtitle || 'Avaliação'}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {/* progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      {/* Footer fixo */}
      {onNext && (
        <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: nextBg }, nextDisabled && styles.disabled]}
              onPress={onNext}
              disabled={nextDisabled}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>{nextLabel}</Text>
              {nextVariant !== 'success' && <ArrowRight size={16} color={NSA.cream} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: NSA.bgBrand,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.8 },
  backText: { color: NSA.cream, fontSize: 13, fontFamily: Fonts.medium },
  stepCounter: {
    color: NSA.cream,
    opacity: 0.7,
    fontSize: 11,
    fontFamily: Fonts.mono,
    letterSpacing: 0.6,
  },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  contextDot: { width: 8, height: 8, borderRadius: 4 },
  contextLabel: {
    color: NSA.cream,
    opacity: 0.75,
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  title: {
    color: NSA.cream,
    fontSize: 22,
    fontFamily: Fonts.loraSemibold,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  progressTrack: {
    marginTop: 14,
    height: 3,
    backgroundColor: 'rgba(255,255,227,0.18)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: NSA.cream,
    borderRadius: 999,
  },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 24 },
  footerWrap: {
    backgroundColor: NSA.bgElevated,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  footer: {
    padding: 16,
  },
  nextButton: {
    minHeight: 52,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nextText: {
    color: NSA.cream,
    fontSize: 15,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.15,
  },
  disabled: { opacity: 0.5 },
});
