import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, PhotoButton } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function HealthStep3() {
  const { paddockId } = useLocalSearchParams();
  const { health, updateHealth } = useRondaStore();

  return (
    <WizardFlow
      title="Sanidade"
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
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: NSA.inkMuted, textAlign: 'center', marginBottom: 20 },
  textarea: {
    minHeight: 120,
    backgroundColor: NSA.bgElevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: NSA.border,
    padding: 16,
    fontSize: 16,
    color: NSA.inkPrimary,
  },
});
