import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function WashingSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { washing } = store;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const wasWashedInt = washing.wasWashed ? 1 : 0;
    const photoUriSafe = washing.photoUri ?? null;

    console.log('[summary-save]', {
      wizard: 'washing',
      rondaId: store.currentRondaId,
      wasWashed: washing.wasWashed,
      photoUri: washing.photoUri,
      insertValues: [store.currentRondaId, wasWashedInt, photoUriSafe],
    });

    try {
      await db.runAsync(
        'INSERT INTO washing_evals (ronda_id, was_washed, photo_uri) VALUES (?, ?, ?)',
        [store.currentRondaId, wasWashedInt, photoUriSafe]
      );
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'lavagem', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      console.error('[summary-save-error]', { wizard: 'washing', err });
      Alert.alert('Erro', 'Falha ao salvar registro de lavagem. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Lavagem"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.lavagem}
      onBack={() => router.back()}
    >
      <ResultCard
        value="LAVAGEM REGISTRADA"
        label="Bebedouro limpo"
        color={NSA.green800}
      />

      <Card>
        <SummaryRow label="Data" value={new Date().toLocaleDateString('pt-BR')} />
        <SummaryRow label="Foto" value={washing.photoUri ? 'Anexada' : 'Sem foto'} />
      </Card>

      <Button
        title={saving ? 'Salvando…' : 'Confirmar'}
        onPress={handleSave}
        disabled={saving}

      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
