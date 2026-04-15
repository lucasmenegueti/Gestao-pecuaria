import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors } from '@/constants';

export default function WeightSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { visualWeight } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const gain = visualWeight.previousWeight ? visualWeight.estimatedWeight - visualWeight.previousWeight : 0;
  const gainPct = visualWeight.previousWeight ? ((gain / visualWeight.previousWeight) * 100).toFixed(1) : '0';

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO visual_weight_evals (ronda_id, category, estimated_weight_kg, previous_weight_kg, previous_date, photo_uri) VALUES (?, ?, ?, ?, ?, ?)',
        [store.currentRondaId, visualWeight.category, visualWeight.estimatedWeight, visualWeight.previousWeight, visualWeight.previousDate, photo]
      );
      // Update herd avg weight
      await db.runAsync(
        'UPDATE herd SET avg_weight_kg = ? WHERE paddock_id = ? AND category = ?',
        [visualWeight.estimatedWeight, Number(paddockId), visualWeight.category]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="PESO VISUAL"
      subtitle={`${store.currentPaddockName} • ${visualWeight.category}`}
      step={3}
      totalSteps={3}
      accentColor={Colors.peso}
      onBack={() => router.back()}
    >
      <View style={styles.summaryBox}>
        <SummaryRow label="Categoria" value={visualWeight.category || '-'} />
        {visualWeight.previousWeight && <SummaryRow label="Peso anterior" value={`${visualWeight.previousWeight} kg`} />}
        <SummaryRow label="Peso novo" value={`${visualWeight.estimatedWeight} kg`} />
      </View>

      {visualWeight.previousWeight ? (
        <ResultCard
          value={`${gain > 0 ? '+' : ''}${gain} kg`}
          label={`${gain > 0 ? '+' : ''}${gainPct}% de ${gain >= 0 ? 'ganho' : 'perda'}`}
          color={gain >= 0 ? Colors.success : Colors.danger}
        />
      ) : (
        <ResultCard
          value={`${visualWeight.estimatedWeight} kg`}
          label="Primeira pesagem"
          color={Colors.peso}
        />
      )}

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'} onPress={handleSave} disabled={saving} variant="success" size="large" style={{ marginTop: 24 }} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2 },
});
