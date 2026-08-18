import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { WizardFlow, BinaryChoice } from '@/components/ui';
import { Colors, sacos, decimal } from '@/constants';
import { bombonaTotalSteps } from '@/lib/bombona';
import { NSA, Fonts, Radius } from '@/theme/nsa';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export default function BombonaStep3() {
  const { paddockId } = useLocalSearchParams();
  const { bombona, updateBombona } = useRondaStore();
  const exp = bombona.expected;

  // Só se chega aqui vindo do step2 com uma fórmula que tem registro. Se o
  // store veio vazio (voltar/recarregar), manda pra contagem em vez de mostrar
  // uma confirmação sem número.
  React.useEffect(() => {
    if (!exp) router.replace(`/ronda/${paddockId}/bombona/step4`);
  }, [exp]);
  if (!exp) return null;

  return (
    <WizardFlow
      title="Bombona"
      subtitle="Confirmação do estoque"
      step={3}
      totalSteps={bombonaTotalSteps(bombona)}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => {
        if (bombona.matchesExpected) {
          // Confirmou: o número do sistema vira a contagem, sem passar pelo slider.
          updateBombona({ sacks: exp.expectedSacks });
          router.push(`/ronda/${paddockId}/bombona/summary`);
        } else {
          // Discordou: o slider começa no valor recusado, pra ele só corrigir.
          updateBombona({ sacks: exp.expectedSacks });
          router.push(`/ronda/${paddockId}/bombona/step4`);
        }
      }}
      nextDisabled={bombona.matchesExpected === null}
    >
      <View style={styles.expectedCard}>
        <Text style={styles.expectedLabel}>O SISTEMA CALCULA</Text>
        <Text style={styles.expectedValue}>{sacos(exp.expectedSacks)}</Text>
        <Text style={styles.expectedFormula}>{exp.formulaName}</Text>
        <Text style={styles.expectedBasis}>
          {sacos(exp.balanceSacks)} {exp.balanceSacks === 1 ? 'entregue' : 'entregues'} em {formatDate(exp.balanceDate)}
          {exp.usedSacks > 0 ? ` · ${decimal(exp.usedSacks)} ${exp.usedSacks === 1 ? 'foi' : 'foram'} pro cocho desde então` : ' · nada foi pro cocho desde então'}
        </Text>
      </View>

      {exp.ledgerNegative && (
        <Text style={styles.warn}>
          Saiu mais ração pro cocho do que a bombona recebeu. A conta se perdeu —
          sua contagem vai corrigir o estoque.
        </Text>
      )}

      <Text style={styles.question}>Confere com o que tem na bombona?</Text>
      <BinaryChoice
        value={bombona.matchesExpected}
        onChange={(v) => updateBombona({ matchesExpected: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  expectedCard: {
    backgroundColor: NSA.warnBg,
    borderRadius: Radius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  expectedLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    color: NSA.inkSecondary,
    marginBottom: 6,
  },
  expectedValue: {
    fontSize: 40,
    fontFamily: Fonts.loraSemibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.8,
  },
  expectedFormula: { fontSize: 15, fontFamily: Fonts.medium, color: NSA.inkPrimary, marginTop: 2 },
  expectedBasis: { fontSize: 13, color: NSA.inkMuted, marginTop: 10, textAlign: 'center', lineHeight: 18 },
  warn: {
    fontSize: 13,
    color: NSA.dangerFg,
    backgroundColor: NSA.dangerBg,
    borderRadius: Radius.lg,
    padding: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
