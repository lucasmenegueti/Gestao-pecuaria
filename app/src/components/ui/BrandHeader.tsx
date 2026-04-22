import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NSA, Fonts } from '@/theme/nsa';
import { useSafeBack } from '@/hooks/use-safe-back';

/**
 * Header de contexto verde profundo do NSA design system.
 * Usado em telas-âncora (Painel, Ronda, Rebanho, Estoque, Mapa) e telas
 * secundárias com voltar (admin, formulários). Substitui o header branco
 * anterior com borda cinza.
 */
export function BrandHeader({
  title,
  context,
  onBack,
  fallback,
  right,
}: {
  title: string;
  context?: string;
  onBack?: () => void;
  /** Rota de fallback quando a stack estiver vazia (router.canGoBack === false). */
  fallback?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const safeBack = useSafeBack(onBack, fallback);
  const showBack = !!onBack || !!fallback;
  return (
    <View
      style={[styles.wrap, { paddingTop: Math.max(insets.top + 8, 20) }]}
    >
      {(showBack || right) && (
        <View style={styles.topRow}>
          {showBack ? (
            <TouchableOpacity onPress={safeBack} style={styles.backBtn} hitSlop={10}>
              <ChevronLeft size={14} color={NSA.cream} strokeWidth={2} />
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          {right ?? <View />}
        </View>
      )}
      {context ? <Text style={styles.context}>{context}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: NSA.bgBrand,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  backText: {
    color: NSA.cream,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  context: {
    color: NSA.cream,
    opacity: 0.6,
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: NSA.cream,
    fontSize: 26,
    fontFamily: Fonts.loraSemibold,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
});
