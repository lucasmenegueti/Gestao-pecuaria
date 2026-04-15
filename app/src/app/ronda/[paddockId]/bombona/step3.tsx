import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

export default function BombonaStep3() {
  const { paddockId } = useLocalSearchParams();
  const { bombona, updateBombona } = useRondaStore();
  const totalKg = bombona.sacks * bombona.kgPerSack;

  return (
    <WizardFlow
      title="BOMBONA"
      subtitle="Quantidade no reservatório"
      step={3}
      totalSteps={4}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/bombona/summary`)}
    >
      <Text style={styles.question}>QUANTOS SACOS NA BOMBONA?</Text>
      <SliderInput
        value={bombona.sacks}
        onValueChange={(v) => updateBombona({ sacks: v })}
        min={0}
        max={100}
        step={1}
        unit="sacos"
        color={Colors.bombona}
      />
      <View style={styles.calcCard}>
        <Text style={styles.calcText}>{bombona.sacks} sacos × {bombona.kgPerSack} kg = {totalKg} kg</Text>
        <Text style={styles.calcSub}>{bombona.formulaName}</Text>
      </View>
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
  calcCard: { backgroundColor: '#fdebd0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  calcText: { fontSize: 18, fontWeight: '700', color: '#2c2c2c' },
  calcSub: { fontSize: 14, color: '#7a7a7a', marginTop: 4 },
});
