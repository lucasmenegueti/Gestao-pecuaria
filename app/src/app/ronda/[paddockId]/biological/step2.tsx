import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function BiologicalStep2() {
  const { paddockId } = useLocalSearchParams();
  const { biologicalWater, updateBiologicalWater } = useRondaStore();

  const label = biologicalWater.quantityG >= 1000
    ? `${(biologicalWater.quantityG / 1000).toFixed(2)} kg`
    : `${biologicalWater.quantityG} g`;

  return (
    <WizardFlow
      title="Biológico na água"
      subtitle="Quantidade aplicada"
      step={2}
      totalSteps={3}
      accentColor={Colors.biologico}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/biological/summary`)}
    >
      <Text style={styles.question}>QUAL A QUANTIDADE UTILIZADA?</Text>
      <SliderInput
        value={biologicalWater.quantityG}
        onValueChange={(v) => updateBiologicalWater({ quantityG: v })}
        min={1}
        max={1000}
        step={1}
        unit="g"
        color={Colors.biologico}
      />
      <Text style={styles.readout}>{label}</Text>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  readout: { fontSize: 16, color: NSA.inkMuted, fontFamily: Fonts.medium, textAlign: 'center', marginTop: 12 },
});
