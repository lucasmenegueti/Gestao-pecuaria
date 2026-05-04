import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function WaterSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { water } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const availableInt = water.available ? 1 : 0;
    const qualitySafe = water.quality ?? null;

    console.log('[summary-save]', {
      wizard: 'water',
      rondaId: store.currentRondaId,
      available: water.available,
      quality: water.quality,
      photo,
      insertValues: [store.currentRondaId, availableInt, qualitySafe, photo],
    });

    try {
      await db.runAsync(
        'INSERT INTO water_evals (ronda_id, available, quality, photo_uri) VALUES (?, ?, ?, ?)',
        [store.currentRondaId, availableInt, qualitySafe, photo]
      );
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      console.error('[summary-save-error]', { wizard: 'water', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de aguada. Tente novamente.');
    }
    setSaving(false);
  }

  const isOk = water.available && (water.quality === 'EXCELENTE' || water.quality === 'BOA');

  return (
    <WizardFlow
      title="Aguada"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.aguada}
      onBack={() => router.back()}
    >
      <Card>
        <SummaryRow label="Água disponível" value={water.available ? 'Sim' : 'Não'} />
        <SummaryRow label="Qualidade" value={water.quality || '-'} />
      </Card>

      <ResultCard
        value={isOk ? 'Aguada OK' : 'Atenção'}
        label={water.quality || ''}
        color={isOk ? NSA.ok : NSA.danger}
      />

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving}  />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
