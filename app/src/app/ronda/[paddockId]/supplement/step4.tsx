import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

export default function SupplementStep4() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement } = useRondaStore();
  const totalKg = supplement.sacksInTrough * supplement.kgPerSack;

  return (
    <WizardFlow
      title="SUPLEMENTAÇÃO"
      subtitle="Quantidade no cocho"
      step={4}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/step7`)}
    >
      <Text style={styles.question}>QUANTOS SACOS COLOCOU NO COCHO?</Text>
      <SliderInput
        value={supplement.sacksInTrough}
        onValueChange={(v) => updateSupplement({ sacksInTrough: v })}
        min={0.5}
        max={200}
        step={0.5}
        unit="sacos"
        color={Colors.suplementacao}
      />
      <View style={styles.calcCard}>
        <Text style={styles.calcText}>
          {supplement.sacksInTrough} sacos × {supplement.kgPerSack} kg = {totalKg} kg
        </Text>
        <Text style={styles.calcSub}>{supplement.formulaName}</Text>
      </View>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
  calcCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  calcText: { fontSize: 18, fontWeight: '700', color: '#2c2c2c' },
  calcSub: { fontSize: 14, color: '#7a7a7a', marginTop: 4 },
});
