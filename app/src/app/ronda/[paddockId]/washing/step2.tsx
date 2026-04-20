import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, PhotoButton } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function WashingStep2() {
  const { paddockId } = useLocalSearchParams();
  const { washing, updateWashing } = useRondaStore();

  return (
    <WizardFlow
      title="Lavagem"
      subtitle="Foto opcional"
      step={2}
      totalSteps={3}
      accentColor={Colors.lavagem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/washing/summary`)}
    >
      <Text style={styles.question}>REGISTRAR COM FOTO?</Text>
      <Text style={styles.sub}>Opcional — tire uma foto do bebedouro lavado</Text>
      <PhotoButton uri={washing.photoUri} onPhoto={(uri) => updateWashing({ photoUri: uri })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: NSA.inkMuted, textAlign: 'center', marginBottom: 20 },
});
