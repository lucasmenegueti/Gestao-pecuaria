import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors, WATER_QUALITY_OPTIONS } from '@/constants';

export default function WaterStep2() {
  const { paddockId } = useLocalSearchParams();
  const { water, updateWater } = useRondaStore();

  return (
    <WizardFlow
      title="AGUADA"
      subtitle="Qualidade da água"
      step={2}
      totalSteps={3}
      accentColor={Colors.aguada}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/water/summary`)}
      nextDisabled={!water.quality}
    >
      <Text style={styles.question}>QUAL A QUALIDADE DA ÁGUA?</Text>
      <MultiChoice
        options={WATER_QUALITY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          description: o.description,
          color: o.color,
        }))}
        value={water.quality}
        onChange={(v) => updateWater({ quality: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
