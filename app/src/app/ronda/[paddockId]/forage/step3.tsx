import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput, Badge } from '@/components/ui';
import { Colors } from '@/constants';

export default function ForageStep3() {
  const { paddockId } = useLocalSearchParams();
  const { forage, updateForage } = useRondaStore();

  return (
    <WizardFlow
      title="FORRAGEM"
      subtitle="2ª Medida"
      step={3}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/forage/step4`)}
    >
      <Badge label="Medida 2 de 3" variant="info" />
      <Text style={styles.question}>2ª MEDIDA</Text>
      <SliderInput
        value={forage.measure2}
        onValueChange={(v) => updateForage({ measure2: v })}
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
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center', marginTop: 12 },
});
