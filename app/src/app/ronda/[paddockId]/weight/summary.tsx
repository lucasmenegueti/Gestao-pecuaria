import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function WeightSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { visualWeight } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const gain = visualWeight.previousWeight ? visualWeight.estimatedWeight - visualWeight.previousWeight : 0;
  const gainPct = visualWeight.previousWeight ? ((gain / visualWeight.previousWeight) * 100).toFixed(1) : '0';

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    if (!visualWeight.category) {
      Alert.alert('Erro', 'Selecione uma categoria antes de finalizar.');
      return;
    }
    setSaving(true);

    const categorySafe = visualWeight.category;
    const estimatedSafe = Number.isFinite(visualWeight.estimatedWeight) ? visualWeight.estimatedWeight : 0;
    const previousSafe = Number.isFinite(visualWeight.previousWeight as number) ? visualWeight.previousWeight : null;
    const previousDateSafe = visualWeight.previousDate ?? null;

    if (__DEV__) console.log('[summary-save]', {
      wizard: 'weight',
      rondaId: store.currentRondaId,
      paddockId: Number(paddockId),
      category: visualWeight.category,
      estimatedWeight: visualWeight.estimatedWeight,
      previousWeight: visualWeight.previousWeight,
      previousDate: visualWeight.previousDate,
      photo,
      insertValues: [store.currentRondaId, categorySafe, estimatedSafe, previousSafe, previousDateSafe, photo],
    });

    try {
      await db.runAsync(
        'INSERT INTO visual_weight_evals (ronda_id, category, estimated_weight_kg, previous_weight_kg, previous_date, photo_uri) VALUES (?, ?, ?, ?, ?, ?)',
        [store.currentRondaId, categorySafe, estimatedSafe, previousSafe, previousDateSafe, photo]
      );
      // Update herd avg weight
      await db.runAsync(
        'UPDATE herd SET avg_weight_kg = ? WHERE paddock_id = ? AND category = ?',
        [estimatedSafe, Number(paddockId), categorySafe]
      );
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'peso_visual', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      if (__DEV__) console.error('[summary-save-error]', { wizard: 'weight', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de peso visual. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Peso visual"
      subtitle={`${store.currentPaddockName ?? '—'} • ${visualWeight.category ?? '—'}`}
      step={3}
      totalSteps={3}
      accentColor={Colors.peso}
      onBack={() => router.back()}
    >
      <Card>
        <SummaryRow label="Categoria" value={visualWeight.category || '-'} />
        {visualWeight.previousWeight && <SummaryRow label="Peso anterior" value={`${visualWeight.previousWeight} kg`} />}
        <SummaryRow label="Peso novo" value={`${visualWeight.estimatedWeight} kg`} />
      </Card>

      {visualWeight.previousWeight ? (
        <ResultCard
          value={`${gain > 0 ? '+' : ''}${gain} kg`}
          label={`${gain > 0 ? '+' : ''}${gainPct}% de ${gain >= 0 ? 'ganho' : 'perda'}`}
          color={gain >= 0 ? NSA.ok : NSA.danger}
        />
      ) : (
        <ResultCard
          value={`${visualWeight.estimatedWeight} kg`}
          label="Primeira pesagem"
          color={Colors.peso}
        />
      )}

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving}  />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
