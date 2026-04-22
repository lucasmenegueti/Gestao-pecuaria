import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput, Badge } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function ForageStep2() {
  const { paddockId } = useLocalSearchParams();
  const { forage, updateForage } = useRondaStore();

  return (
    <WizardFlow
      title="Forragem"
      subtitle="1ª Medida"
      step={2}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/forage/step3`)}
    >
      <Badge label="Medida 1 de 3" variant="info" />
      <Text style={styles.question}>1ª medida</Text>
      <SliderInput
        value={forage.measure1}
        onValueChange={(v) => updateForage({ measure1: v })}
        min={0}
        max={250}
        step={1}
        unit="cm"
        color={Colors.forragem}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center', marginTop: 12 },
});
