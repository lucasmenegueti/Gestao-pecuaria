import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function SupplementStep3() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const { supplement, updateSupplement } = useRondaStore();
  const [formulas, setFormulas] = useState<Array<{ id: number; name: string; kg: number; consumption: number }>>([]);

  useEffect(() => {
    db.getAllAsync<{ id: number; name: string; kg_per_sack: number; target_consumption_g_per_day: number }>(
      'SELECT * FROM formulas WHERE active = 1'
    ).then((rows) => setFormulas(rows.map((r) => ({ id: r.id, name: r.name, kg: r.kg_per_sack, consumption: r.target_consumption_g_per_day }))));
  }, []);

  return (
    <WizardFlow
      title="SUPLEMENTAÇÃO"
      subtitle="Qual formulação?"
      step={3}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/supplement/step4`)}
      nextDisabled={!supplement.formulaId}
    >
      <Text style={styles.question}>QUAL FORMULAÇÃO?</Text>
      <MultiChoice
        options={formulas.map((f) => ({
          value: String(f.id),
          label: f.name,
          description: `${f.kg} kg/saco • ${f.consumption} g/cab/dia`,
          color: Colors.suplementacao,
        }))}
        value={supplement.formulaId ? String(supplement.formulaId) : null}
        onChange={(v) => {
          const f = formulas.find((f) => f.id === Number(v));
          if (f) {
            updateSupplement({
              formulaId: f.id,
              formulaName: f.name,
              kgPerSack: f.kg,
              consumptionGPerDay: f.consumption,
            });
          }
        }}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
