import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, PhotoButton } from '@/components/ui';
import { Colors } from '@/constants';

export default function HealthStep3() {
  const { paddockId } = useLocalSearchParams();
  const { health, updateHealth } = useRondaStore();

  return (
    <WizardFlow
      title="SANIDADE"
      subtitle="Observações"
      step={3}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/health/summary`)}
    >
      <Text style={styles.question}>OBSERVAÇÕES</Text>
      <Text style={styles.sub}>Descreva o que observou nos animais</Text>
      <TextInput
        style={styles.textarea}
        value={health.observations}
        onChangeText={(v) => updateHealth({ observations: v })}
        placeholder="Ex: Carrapato no pescoço de 12 garrotes..."
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      <PhotoButton uri={health.photoUri} onPhoto={(uri) => updateHealth({ photoUri: uri })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: '#7a7a7a', textAlign: 'center', marginBottom: 20 },
  textarea: {
    minHeight: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0dcd5',
    padding: 16,
    fontSize: 16,
    color: '#2c2c2c',
  },
});
