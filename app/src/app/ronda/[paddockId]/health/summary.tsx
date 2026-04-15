import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button } from '@/components/ui';
import { Colors } from '@/constants';

export default function HealthSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { health } = store;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO health_evals (ronda_id, parasite_free, affected_pct, observations, photo_uri) VALUES (?, ?, ?, ?, ?)',
        [store.currentRondaId, health.parasiteFree ? 1 : 0, health.affectedPct, health.observations, health.photoUri]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="SANIDADE"
      subtitle={`${store.currentPaddockName} • ${store.currentPaddockHeads} cabeças`}
      step={4}
      totalSteps={4}
      accentColor={Colors.sanidade}
      onBack={() => router.back()}
    >
      {health.parasiteFree ? (
        <ResultCard icon="🩺" value="LIVRE" label="Sem parasitas detectados" color={Colors.success} />
      ) : (
        <ResultCard icon="🩺" value={`${health.affectedPct}%`} label="do rebanho afetado" color={Colors.danger} />
      )}
      <View style={styles.summaryBox}>
        <SummaryRow label="Livre de parasitas" value={health.parasiteFree ? '✅ SIM' : '❌ NÃO'} />
        {!health.parasiteFree && <SummaryRow label="% afetados" value={`${health.affectedPct}%`} />}
        {health.observations ? <SummaryRow label="Observações" value={health.observations} /> : null}
      </View>
      <Button title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'} onPress={handleSave} disabled={saving} variant="success" size="large" style={{ marginTop: 24 }} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2 },
});
