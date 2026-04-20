import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function ForageStep5() {
  const { paddockId } = useLocalSearchParams();
  const { forage, updateForage } = useRondaStore();

  return (
    <WizardFlow
      title="Forragem"
      subtitle="Qualidade do capim"
      step={5}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/forage/summary`)}
      nextDisabled={!forage.quality}
    >
      <Text style={styles.question}>Qual a qualidade desse capim?</Text>
      <MultiChoice
        options={[
          { value: 'BOM', label: 'BOM', color: Colors.success, icon: '🟢' },
          { value: 'REGULAR', label: 'REGULAR', color: Colors.warning, icon: '🟡' },
          { value: 'RUIM', label: 'RUIM', color: Colors.danger, icon: '🔴' },
        ]}
        value={forage.quality}
        onChange={(v) => updateForage({ quality: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
