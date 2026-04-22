import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function HealthStep1() {
  const { paddockId } = useLocalSearchParams();
  const { health, updateHealth, resetHealth } = useRondaStore();

  React.useEffect(() => { resetHealth(); }, []);

  return (
    <WizardFlow
      title="Sanidade"
      subtitle="Parasitas"
      step={1}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
      onNext={() => {
        if (health.parasiteFree === false) {
          router.push(`/ronda/${paddockId}/health/step2`);
        } else {
          router.push(`/ronda/${paddockId}/health/summary`);
        }
      }}
      nextDisabled={health.parasiteFree === null}
    >
      <Text style={styles.question}>Rebanho livre de parasitas?</Text>
      <Text style={styles.sub}>(mosca, berne e carrapato)</Text>
      <BinaryChoice value={health.parasiteFree} onChange={(v) => updateHealth({ parasiteFree: v })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: NSA.inkMuted, textAlign: 'center', marginBottom: 20 },
});
