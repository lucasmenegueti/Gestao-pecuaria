import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors, decimal, plural, sacos } from '@/constants';
import { bombonaTotalSteps } from '@/lib/bombona';
import { NSA, Fonts, Radius } from '@/theme/nsa';

export default function BombonaStep4() {
  const { paddockId } = useLocalSearchParams();
  const { bombona, updateBombona } = useRondaStore();
  const totalKg = bombona.sacks * bombona.kgPerSack;
  const exp = bombona.expected;
  const diff = exp ? bombona.sacks - exp.expectedSacks : 0;

  return (
    <WizardFlow
      title="Bombona"
      subtitle="Contagem real"
      // Sem confirmação antes, esta é a 3ª tela; com ela, a 4ª.
      step={exp ? 4 : 3}
      totalSteps={bombonaTotalSteps(bombona)}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/bombona/summary`)}
    >
      <Text style={styles.question}>
        {exp ? 'Quantos sacos tem de verdade?' : 'Quantos sacos na bombona?'}
      </Text>
      <SliderInput
        value={bombona.sacks}
        onValueChange={(v) => updateBombona({ sacks: v })}
        min={0}
        max={20}
        step={0.5}
        unit="sacos"
        unitSingular="saco"
        color={Colors.bombona}
      />
      <View style={styles.calcCard}>
        <Text style={styles.calcText}>
          {decimal(bombona.sacks)} {plural(bombona.sacks, 'saco', 'sacos')} × {bombona.kgPerSack} kg = {decimal(totalKg)} kg
        </Text>
        <Text style={styles.calcSub}>{bombona.formulaName}</Text>
      </View>
      {exp && diff !== 0 && (
        <Text style={styles.diff}>
          {diff > 0 ? `${sacos(diff)} a mais` : `${sacos(-diff)} a menos`} do que o sistema calculava.
          O estoque vai ser corrigido pra sua contagem.
        </Text>
      )}
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  calcCard: { backgroundColor: NSA.warnBg, borderRadius: Radius.xl, padding: 16, alignItems: 'center', marginTop: 16 },
  calcText: { fontSize: 18, fontFamily: Fonts.semibold, color: NSA.inkPrimary },
  calcSub: { fontSize: 14, color: NSA.inkMuted, marginTop: 4 },
  diff: { fontSize: 14, color: NSA.inkSecondary, textAlign: 'center', marginTop: 14, lineHeight: 20 },
});
