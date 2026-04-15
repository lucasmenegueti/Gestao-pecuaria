import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function SupplementStep7() {
  const { paddockId } = useLocalSearchParams();
  const { supplement, updateSupplement } = useRondaStore();

  return (
    <WizardFlow
      title="SUPLEMENTAÇÃO"
      subtitle="Acesso ao cocho"
      step={5}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/summary`)}
      nextDisabled={!supplement.troughAccess}
    >
      <Text style={styles.question}>COMO ESTÁ O ACESSO AO COCHO?</Text>
      <MultiChoice
        options={[
          { value: 'BOM', label: 'BOM', description: 'Animais acessam sem problemas', color: Colors.success, icon: '🟢' },
          { value: 'RUIM', label: 'RUIM', description: 'Acesso difícil, precisa corrigir', color: Colors.danger, icon: '🔴' },
        ]}
        value={supplement.troughAccess}
        onChange={(v) => updateSupplement({ troughAccess: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
