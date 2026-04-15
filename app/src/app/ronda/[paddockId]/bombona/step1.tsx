import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function BombonaStep1() {
  const { paddockId } = useLocalSearchParams();
  const { bombona, updateBombona, resetBombona } = useRondaStore();

  React.useEffect(() => { resetBombona(); }, []);

  return (
    <WizardFlow
      title="BOMBONA"
      subtitle="Estoque do reservatório"
      step={1}
      totalSteps={4}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => {
        if (bombona.hasStock) {
          router.push(`/ronda/${paddockId}/bombona/step2`);
        } else {
          router.push(`/ronda/${paddockId}/bombona/summary`);
        }
      }}
      nextDisabled={bombona.hasStock === null}
    >
      <Text style={styles.question}>TEM RAÇÃO NA BOMBONA?</Text>
      <Text style={styles.sub}>(reservatório do cocho)</Text>
      <BinaryChoice
        value={bombona.hasStock}
        onChange={(v) => updateBombona({ hasStock: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 16, color: '#7a7a7a', textAlign: 'center', marginBottom: 20 },
});
