import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function BombonaStep3() {
  const { paddockId } = useLocalSearchParams();
  const { bombona, updateBombona } = useRondaStore();
  const totalKg = bombona.sacks * bombona.kgPerSack;

  return (
    <WizardFlow
      title="Bombona"
      subtitle="Quantidade no reservatório"
      step={3}
      totalSteps={4}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/bombona/summary`)}
    >
      <Text style={styles.question}>Quantos sacos na bombona?</Text>
      <SliderInput
        value={bombona.sacks}
        onValueChange={(v) => updateBombona({ sacks: v })}
        min={0}
        max={10}
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
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  calcCard: { backgroundColor: '#fdebd0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  calcText: { fontSize: 18, fontFamily: Fonts.semibold, color: NSA.inkPrimary },
  calcSub: { fontSize: 14, color: NSA.inkMuted, marginTop: 4 },
});
