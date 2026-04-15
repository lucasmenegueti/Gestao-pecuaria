import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function WaterStep1() {
  const { paddockId } = useLocalSearchParams();
  const { water, updateWater, resetWater } = useRondaStore();

  React.useEffect(() => { resetWater(); }, []);

  return (
    <WizardFlow
      title="AGUADA"
      subtitle="Disponibilidade de água"
      step={1}
      totalSteps={3}
      accentColor={Colors.aguada}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/water/step2`)}
      nextDisabled={water.available === null}
    >
      <Text style={styles.question}>A ÁGUA ESTÁ DISPONÍVEL NO PASTO?</Text>
      <BinaryChoice value={water.available} onChange={(v) => updateWater({ available: v })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
