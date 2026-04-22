import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors, plural } from '@/constants';
import { NSA, Fonts, Radius } from '@/theme/nsa';

export default function SupplementStep4() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement } = useRondaStore();
  const totalKg = supplement.sacksInTrough * supplement.kgPerSack;

  return (
    <WizardFlow
      title="Suplementação"
      subtitle="Quantidade no cocho"
      step={4}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/step7`)}
    >
      <Text style={styles.question}>Quantos sacos colocou no cocho?</Text>
      <SliderInput
        value={supplement.sacksInTrough}
        onValueChange={(v) => updateSupplement({ sacksInTrough: v })}
        min={1}
        max={10}
        step={1}
        unit="sacos"
        color={Colors.suplementacao}
      />
      <View style={styles.calcCard}>
        <Text style={styles.calcText}>
          {supplement.sacksInTrough} {plural(supplement.sacksInTrough, 'saco', 'sacos')} × {supplement.kgPerSack} kg = {totalKg} kg
        </Text>
        <Text style={styles.calcSub}>{supplement.formulaName}</Text>
      </View>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  calcCard: {
    backgroundColor: NSA.infoBg,
    borderRadius: Radius.xl,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  calcText: { fontSize: 18, fontFamily: Fonts.semibold, color: NSA.inkPrimary },
  calcSub: { fontSize: 14, color: NSA.inkMuted, marginTop: 4 },
});
