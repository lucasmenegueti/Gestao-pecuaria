import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function SupplementStep2() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement } = useRondaStore();

  return (
    <WizardFlow
      title="Suplementação"
      subtitle="Abastecimento do cocho"
      step={2}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => {
        if (supplement.restocked) {
          router.push(`/ronda/${paddockId}/supplement/step3`);
        } else {
          router.push(`/ronda/${paddockId}/supplement/step7`);
        }
      }}
      nextDisabled={supplement.restocked === null}
    >
      <Text style={styles.question}>VOCÊ ABASTECEU O COCHO?</Text>
      <BinaryChoice
        value={supplement.restocked}
        onChange={(v) => updateSupplement({ restocked: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
