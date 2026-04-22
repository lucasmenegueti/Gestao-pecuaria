import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function HealthSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { health } = store;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const parasiteFreeInt = health.parasiteFree ? 1 : 0;
    const affectedPctSafe = Number.isFinite(health.affectedPct) ? health.affectedPct : 0;
    const observationsSafe = health.observations ?? '';

    console.log('[summary-save]', {
      wizard: 'health',
      rondaId: store.currentRondaId,
      parasiteFree: health.parasiteFree,
      affectedPct: health.affectedPct,
      observations: health.observations,
      photoUri: health.photoUri,
      insertValues: [store.currentRondaId, parasiteFreeInt, affectedPctSafe, observationsSafe, health.photoUri],
    });

    try {
      await db.runAsync(
        'INSERT INTO health_evals (ronda_id, parasite_free, affected_pct, observations, photo_uri) VALUES (?, ?, ?, ?, ?)',
        [store.currentRondaId, parasiteFreeInt, affectedPctSafe, observationsSafe, health.photoUri]
      );
      router.replace('/(tabs)/ronda');
    } catch (err) {
      console.error('[summary-save-error]', { wizard: 'health', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de sanidade. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Sanidade"
      subtitle={`${store.currentPaddockName ?? '—'} • ${store.currentPaddockHeads || '—'} cabeças`}
      step={4}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
    >
      {health.parasiteFree ? (
        <ResultCard value="LIVRE" label="Sem parasitas detectados" color={NSA.green800} />
      ) : (
        <ResultCard value={`${health.affectedPct}%`} label="do rebanho afetado" color={NSA.danger} />
      )}
      <Card>
        <SummaryRow label="Livre de parasitas" value={health.parasiteFree ? 'Sim' : 'Não'} />
        {!health.parasiteFree && <SummaryRow label="% afetados" value={`${health.affectedPct}%`} />}
        {health.observations ? <SummaryRow label="Observações" value={health.observations} /> : null}
      </Card>
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving}  />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
