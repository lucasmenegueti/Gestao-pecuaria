import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function ForageStep1() {
  const { paddockId } = useLocalSearchParams();
  const { forage, updateForage, resetForage } = useRondaStore();

  React.useEffect(() => { resetForage(); }, []);

  return (
    <WizardFlow
      title="Forragem"
      subtitle="Tipo de medição"
      step={1}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/forage/step2`)}
      nextDisabled={!forage.measurementType}
    >
      <Text style={styles.question}>Qual é o tipo de medição?</Text>
      <MultiChoice
        options={[
          { value: 'ENTRADA', label: 'Entrada', description: 'Gado entrando no pasto', color: NSA.ok },
          { value: 'AFERICAO', label: 'Aferição', description: 'Medição de acompanhamento', color: NSA.warn },
          { value: 'SAIDA', label: 'Saída', description: 'Gado saindo do pasto', color: NSA.danger },
        ]}
        value={forage.measurementType}
        onChange={(v) => updateForage({ measurementType: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
