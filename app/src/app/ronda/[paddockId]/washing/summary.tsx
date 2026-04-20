import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function WashingSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { washing } = store;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO washing_evals (ronda_id, was_washed, photo_uri) VALUES (?, ?, ?)',
        [store.currentRondaId, washing.wasWashed ? 1 : 0, washing.photoUri]
      );
      router.dismissAll();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
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
        label="Bebedouro limpo ✓"
        color={NSA.green800}
      />

      <Card>
        <SummaryRow label="Data" value={new Date().toLocaleDateString('pt-BR')} />
        <SummaryRow label="Foto" value={washing.photoUri ? '📸 Anexada' : 'Sem foto'} />
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
