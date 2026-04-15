import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function HealthStep1() {
  const { paddockId } = useLocalSearchParams();
  const { health, updateHealth, resetHealth } = useRondaStore();

  React.useEffect(() => { resetHealth(); }, []);

  return (
    <WizardFlow
      title="SANIDADE"
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
      <Text style={styles.question}>REBANHO LIVRE DE PARASITAS?</Text>
      <Text style={styles.sub}>(mosca, berne e carrapato)</Text>
      <BinaryChoice value={health.parasiteFree} onChange={(v) => updateHealth({ parasiteFree: v })} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: '#7a7a7a', textAlign: 'center', marginBottom: 20 },
});
