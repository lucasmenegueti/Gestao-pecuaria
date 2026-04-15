import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, MultiChoice } from '@/components/ui';
import { Colors } from '@/constants';

export default function WeightStep1() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const { visualWeight, updateVisualWeight, resetVisualWeight } = useRondaStore();
  const [categories, setCategories] = useState<Array<{ category: string; head_count: number }>>([]);

  useEffect(() => {
    resetVisualWeight();
    db.getAllAsync<{ category: string; head_count: number }>(
      'SELECT category, head_count FROM herd WHERE paddock_id = ?',
      [Number(paddockId)]
    ).then(setCategories);
  }, []);

  return (
    <WizardFlow
      title="PESO VISUAL"
      subtitle="Categoria"
      step={1}
      totalSteps={3}
      accentColor={Colors.peso}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/weight/step2`)}
      nextDisabled={!visualWeight.category}
    >
      <Text style={styles.question}>QUAL CATEGORIA?</Text>
      <MultiChoice
        options={categories.map((c) => ({
          value: c.category,
          label: c.category,
          description: `${c.head_count} cabeças`,
          color: Colors.peso,
        }))}
        value={visualWeight.category}
        onChange={(v) => updateVisualWeight({ category: v })}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontWeight: '800', color: '#2c2c2c', marginBottom: 20, textAlign: 'center' },
});
