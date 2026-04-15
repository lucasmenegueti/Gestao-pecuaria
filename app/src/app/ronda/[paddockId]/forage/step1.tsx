import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function ForageStep1() {
  const { paddockId } = useLocalSearchParams();
  const { forage, updateForage, resetForage } = useRondaStore();

  React.useEffect(() => { resetForage(); }, []);

  return (
    <WizardFlow
      title="FORRAGEM"
      subtitle="Tipo de medição"
      step={1}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/forage/step2`)}
      nextDisabled={!forage.measurementType}
    >
      <Text style={styles.question}>TIPO DE MEDIÇÃO?</Text>
      <MultiChoice
        options={[
          { value: 'ENTRADA', label: 'ENTRADA', description: 'Gado entrando no pasto', color: Colors.success, icon: '🟢' },
          { value: 'AFERICAO', label: 'AFERIÇÃO', description: 'Medição de acompanhamento', color: Colors.warning, icon: '🟡' },
          { value: 'SAIDA', label: 'SAÍDA', description: 'Gado saindo do pasto', color: Colors.danger, icon: '🔴' },
        ]}
        value={forage.measurementType}
        onChange={(v) => updateForage({ measurementType: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
