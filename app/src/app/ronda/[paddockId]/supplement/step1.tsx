import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors, TROUGH_SCORE_OPTIONS } from '@/constants';

export default function SupplementStep1() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement, resetSupplement } = useRondaStore();

  React.useEffect(() => { resetSupplement(); }, []);

  return (
    <WizardFlow
      title="SUPLEMENTAÇÃO"
      subtitle="Como está o cocho?"
      step={1}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/step2`)}
      nextDisabled={!supplement.troughScore}
    >
      <Text style={styles.question}>COMO ESTÁ O COCHO?</Text>
      <MultiChoice
        options={TROUGH_SCORE_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          description: o.description,
          color: o.color,
        }))}
        value={supplement.troughScore}
        onChange={(v) => updateSupplement({ troughScore: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
