import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function BiologicalStep1() {
  const { paddockId } = useLocalSearchParams();
  const { biologicalWater, updateBiologicalWater, resetBiologicalWater } = useRondaStore();

  React.useEffect(() => { resetBiologicalWater(); }, []);

  return (
    <WizardFlow
      title="Biológico na água"
      subtitle="Registrar aplicação"
      step={1}
      totalSteps={3}
      accentColor={Colors.biologico}
      onBack={() => router.back()}
      onNext={() => {
        if (biologicalWater.applied) {
          router.push(`/ronda/${paddockId}/biological/step2`);
        } else {
          router.push(`/ronda/${paddockId}/biological/summary`);
        }
      }}
      nextDisabled={biologicalWater.applied === null}
    >
      <Text style={styles.question}>Você colocou biológico na água?</Text>
      <BinaryChoice
        value={biologicalWater.applied}
        onChange={(v) => updateBiologicalWater({ applied: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
