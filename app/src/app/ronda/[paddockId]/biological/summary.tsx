import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button, Card, PhotoButton } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function BiologicalSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { biologicalWater } = store;
  const [saving, setSaving] = useState(false);

  const applied = biologicalWater.applied === true;
  const qtyLabel = applied
    ? (biologicalWater.quantityG >= 1000
        ? `${(biologicalWater.quantityG / 1000).toFixed(2)} kg`
        : `${biologicalWater.quantityG} g`)
    : '—';

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO biological_water_evals (ronda_id, applied, quantity_g, photo_uri) VALUES (?, ?, ?, ?)',
        [
          store.currentRondaId,
          applied ? 1 : 0,
          applied ? biologicalWater.quantityG : null,
          biologicalWater.photoUri,
        ]
      );
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'biologico', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Biológico na água"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.biologico}
      onBack={() => router.back()}
    >
      <ResultCard
        value={applied ? qtyLabel : 'Não aplicado'}
        label={applied ? 'Biológico aplicado' : 'Sem aplicação hoje'}
        color={applied ? NSA.green800 : NSA.inkMuted}
      />

      <Card>
        <SummaryRow label="Aplicou biológico" value={applied ? 'Sim' : 'Não'} />
        {applied && <SummaryRow label="Quantidade" value={qtyLabel} />}
        <SummaryRow label="Data" value={new Date().toLocaleDateString('pt-BR')} />
      </Card>

      {applied && (
        <PhotoButton
          uri={biologicalWater.photoUri}
          onPhoto={(uri) => store.updateBiologicalWater({ photoUri: uri })}
        />
      )}

      <Button
        title={saving ? 'Salvando…' : 'Confirmar'}
        onPress={handleSave}
        disabled={saving}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({});
