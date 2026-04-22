import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA, Fonts, Radius } from '@/theme/nsa';

export default function WeightStep2() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { visualWeight, updateVisualWeight } = store;

  useEffect(() => {
    // Load previous weight for this category in this paddock
    db.getFirstAsync<{ estimated_weight_kg: number; created_at: string }>(
      `SELECT e.estimated_weight_kg, e.created_at FROM visual_weight_evals e
       JOIN rondas r ON r.id = e.ronda_id
       WHERE r.paddock_id = ? AND e.category = ?
       ORDER BY e.created_at DESC LIMIT 1`,
      [Number(paddockId), visualWeight.category]
    ).then((row) => {
      if (row) {
        updateVisualWeight({
          previousWeight: row.estimated_weight_kg,
          previousDate: row.created_at.split('T')[0] || row.created_at.split(' ')[0],
          estimatedWeight: row.estimated_weight_kg,
        });
      }
    });
  }, [visualWeight.category]);

  return (
    <WizardFlow
      title="Peso visual"
      subtitle={`${visualWeight.category ?? '—'} · ${store.currentPaddockName ?? '—'}`}
      step={2}
      totalSteps={3}
      accentColor={Colors.peso}
      onBack={() => router.back()}
      onNext={() => router.push(`/ronda/${paddockId}/weight/summary`)}
    >
      <Text style={styles.question}>Peso médio estimado?</Text>
      {visualWeight.previousWeight && (
        <View style={styles.prevCard}>
          <Text style={styles.prevText}>Peso anterior: {visualWeight.previousWeight} kg ({visualWeight.previousDate})</Text>
        </View>
      )}
      <SliderInput
        value={visualWeight.estimatedWeight}
        onValueChange={(v) => updateVisualWeight({ estimatedWeight: v })}
        min={50}
        max={800}
        step={5}
        unit="kg"
        color={Colors.peso}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 22, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 20, textAlign: 'center' },
  prevCard: { backgroundColor: NSA.infoBg, borderRadius: Radius.xl, padding: 12, alignItems: 'center', marginBottom: 16 },
  prevText: { fontSize: 16, fontFamily: Fonts.medium, color: NSA.infoFg },
});
