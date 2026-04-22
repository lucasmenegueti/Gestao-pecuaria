import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

export default function BombonaStep2() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const { bombona, updateBombona } = useRondaStore();
  const [formulas, setFormulas] = useState<Array<{ id: number; name: string; kg: number }>>([]);

  useEffect(() => {
    db.getAllAsync<{ id: number; name: string; kg_per_sack: number }>(
      'SELECT * FROM formulas WHERE active = 1'
    ).then((rows) => setFormulas(rows.map((r) => ({ id: r.id, name: r.name, kg: r.kg_per_sack }))));
  }, []);

  return (
    <WizardFlow
      title="Bombona"
      subtitle="Qual formulação?"
      step={2}
      totalSteps={4}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/bombona/step3`)}
      nextDisabled={!bombona.formulaId}
    >
      <Text style={styles.question}>Qual formulação?</Text>
      <MultiChoice
        options={formulas.map((f) => ({
          value: String(f.id),
          label: f.name,
          description: `${f.kg} kg/saco`,
          color: Colors.bombona,
        }))}
        value={bombona.formulaId ? String(bombona.formulaId) : null}
        onChange={(v) => {
          const f = formulas.find((f) => f.id === Number(v));
          if (f) {
            updateBombona({ formulaId: f.id, formulaName: f.name, kgPerSack: f.kg });
          }
        }}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
});
