import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors, sacos } from '@/constants';
import { loadBombonaExpectations, bombonaTotalSteps, type BombonaExpectation } from '@/lib/bombona';
import { NSA, Fonts } from '@/theme/nsa';

export default function BombonaStep2() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const { bombona, updateBombona } = useRondaStore();
  const [formulas, setFormulas] = useState<Array<{ id: number; name: string; kg: number }>>([]);
  const [expectations, setExpectations] = useState<BombonaExpectation[]>([]);

  useEffect(() => {
    // Inclui também fórmulas inativas que ainda têm saldo em qualquer inventory —
    // se o admin desativou um produto que ainda está nas bombonas, o peão precisa
    // poder selecioná-lo pra registrar a avaliação. Sem isso, ronda Bombona ficava
    // travada em piquetes que tinham produto descontinuado armazenado.
    db.getAllAsync<{ id: number; name: string; kg_per_sack: number }>(
      `SELECT * FROM formulas WHERE active = 1
       OR id IN (SELECT formula_id FROM inventory WHERE quantity_sacks > 0)
       ORDER BY name`
    ).then((rows) => setFormulas(rows.map((r) => ({ id: r.id, name: r.name, kg: r.kg_per_sack }))));
    loadBombonaExpectations(db, Number(paddockId)).then(setExpectations);
  }, []);

  return (
    <WizardFlow
      title="Bombona"
      subtitle="Qual formulação?"
      step={2}
      totalSteps={bombonaTotalSteps(bombona)}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => {
        // Sem registro dessa fórmula na bombona não há o que confirmar — vai
        // direto pra contagem, que é o fluxo antigo.
        const next = bombona.expected ? 'step3' : 'step4';
        router.push(`/ronda/${paddockId}/bombona/${next}`);
      }}
      nextDisabled={!bombona.formulaId}
    >
      <Text style={styles.question}>Qual formulação?</Text>
      <MultiChoice
        options={formulas.map((f) => {
          const exp = expectations.find((e) => e.formulaId === f.id);
          return {
            value: String(f.id),
            label: f.name,
            description: exp
              ? `${f.kg} kg/saco · sistema: ${sacos(exp.expectedSacks)}`
              : `${f.kg} kg/saco`,
            color: Colors.bombona,
          };
        })}
        value={bombona.formulaId ? String(bombona.formulaId) : null}
        onChange={(v) => {
          const f = formulas.find((f) => f.id === Number(v));
          if (f) {
            updateBombona({
              formulaId: f.id,
              formulaName: f.name,
              kgPerSack: f.kg,
              expected: expectations.find((e) => e.formulaId === f.id) ?? null,
              // Trocar de fórmula invalida a confirmação da anterior.
              matchesExpected: null,
            });
          }
        }}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
