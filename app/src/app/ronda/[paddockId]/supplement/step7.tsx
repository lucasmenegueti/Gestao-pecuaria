import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function SupplementStep7() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement } = useRondaStore();

  return (
    <WizardFlow
      title="Suplementação"
      subtitle="Acesso ao cocho"
      step={5}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/summary`)}
      nextDisabled={!supplement.troughAccess}
    >
      <Text style={styles.question}>Como está o acesso ao cocho?</Text>
      <MultiChoice
        options={[
          { value: 'BOM', label: 'Bom', description: 'Animais acessam sem problemas', color: NSA.ok },
          { value: 'RUIM', label: 'Ruim', description: 'Acesso difícil, precisa corrigir', color: NSA.danger },
        ]}
        value={supplement.troughAccess}
        onChange={(v) => updateSupplement({ troughAccess: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
