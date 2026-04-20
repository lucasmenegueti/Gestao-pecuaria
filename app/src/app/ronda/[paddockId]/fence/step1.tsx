import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function FenceStep1() {
  const { paddockId } = useLocalSearchParams();
  const { fence, updateFence, resetFence } = useRondaStore();

  React.useEffect(() => { resetFence(); }, []);

  return (
    <WizardFlow
      title="Cerca"
      subtitle="Contenção"
      step={1}
      totalSteps={3}
      accentColor={Colors.cerca}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/fence/step2`)}
      nextDisabled={fence.preventsMixing === null}
    >
      <Text style={styles.question}>A CERCA EVITA A MISTURA INDEVIDA DE ANIMAIS?</Text>
      <BinaryChoice value={fence.preventsMixing} onChange={(v) => updateFence({ preventsMixing: v })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
