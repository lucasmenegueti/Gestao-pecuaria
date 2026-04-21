import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts, Radius, DOMAIN } from '@/theme/nsa';

export default function HealthStep2() {
  const { paddockId } = useLocalSearchParams();
  const store = useRondaStore();
  const { health, updateHealth } = store;
  const estimatedHeads = Math.round((health.affectedPct / 100) * store.currentPaddockHeads);

  return (
    <WizardFlow
      title="Sanidade"
      subtitle="% afetados"
      step={2}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/health/step3`)}
    >
      <Text style={styles.question}>Qual % dos animais afetados?</Text>
      <SliderInput
        value={health.affectedPct}
        onValueChange={(v) => updateHealth({ affectedPct: v })}
        min={0}
        max={100}
        step={1}
        unit="%"
        color={Colors.sanidade}
      />
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>~{estimatedHeads} de {store.currentPaddockHeads} cabeças</Text>
      </View>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  infoCard: { backgroundColor: DOMAIN.sanidade.tint, borderRadius: Radius.xl, padding: 16, alignItems: 'center', marginTop: 16 },
  infoText: { fontSize: 16, fontFamily: Fonts.medium, color: DOMAIN.sanidade.dot },
});
