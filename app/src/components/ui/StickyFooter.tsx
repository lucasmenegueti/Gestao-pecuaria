import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NSA } from '@/theme/nsa';

/**
 * Footer fixo na parte inferior da tela — usado pra CTAs primários que o peão
 * sempre precisa alcançar sem rolar (Confirmar, Iniciar rota, Revisar, etc.).
 *
 * Usa `useSafeAreaInsets` em vez de `SafeAreaView` pra funcionar mesmo quando
 * o screen já tem um SafeAreaView externo (evita double padding).
 *
 * Padrão: ScrollView com paddingBottom ≥ 100 pra não deixar a última card
 * atrás do footer. Ver CLAUDE.md seção "Design system".
 */
export function StickyFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 0) }, style]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: NSA.bgElevated,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  inner: {
    padding: 16,
  },
});
