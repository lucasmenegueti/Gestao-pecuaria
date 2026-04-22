import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function WashingStep1() {
  const { paddockId } = useLocalSearchParams();
  const { washing, updateWashing, resetWashing } = useRondaStore();

  React.useEffect(() => { resetWashing(); }, []);

  return (
    <WizardFlow
      title="Lavagem"
      subtitle="Registrar lavagem"
      step={1}
      totalSteps={3}
      accentColor={Colors.lavagem}
      onBack={() => router.back()}
      onNext={() => {
        if (washing.wasWashed) {
          router.push(`/ronda/${paddockId}/washing/step2`);
        } else {
          router.replace('/(tabs)/ronda');
        }
      }}
      nextDisabled={washing.wasWashed === null}
    >
      <Text style={styles.question}>Você lavou o bebedouro?</Text>
      <BinaryChoice value={washing.wasWashed} onChange={(v) => updateWashing({ wasWashed: v })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
