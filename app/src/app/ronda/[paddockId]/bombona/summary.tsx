import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function BombonaSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { bombona } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalKg = bombona.sacks * bombona.kgPerSack;
  const step = bombona.hasStock ? 4 : 2;
  const totalSteps = bombona.hasStock ? 4 : 2;

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        `INSERT INTO bombona_evals (ronda_id, has_stock, formula_id, sacks, photo_uri) VALUES (?, ?, ?, ?, ?)`,
        [
          store.currentRondaId,
          bombona.hasStock ? 1 : 0,
          bombona.hasStock ? bombona.formulaId : null,
          bombona.hasStock ? bombona.sacks : null,
          photo,
        ]
      );
      router.dismissAll();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar avaliação');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Bombona"
      subtitle={store.currentPaddockName || ''}
      step={step}
      totalSteps={totalSteps}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
    >
      {bombona.hasStock ? (
        <ResultCard
          value={`${bombona.sacks} sacos`}
          label={`${totalKg} kg ${bombona.formulaName || ''}`}
          color={bombona.sacks > 0 ? NSA.ok : NSA.warn}
        />
      ) : (
        <ResultCard
          value="Bombona vazia"
          label="Reabastecer"
          color={NSA.danger}
        />
      )}

      <Card>
        <SummaryRow label="Tem estoque" value={bombona.hasStock ? 'Sim' : 'Não'} />
        {bombona.hasStock && (
          <>
            <SummaryRow label="Formulação" value={bombona.formulaName || '-'} />
            <SummaryRow label="Sacos" value={`${bombona.sacks} sacos`} />
            <SummaryRow label="Total" value={`${totalKg} kg`} />
          </>
        )}
      </Card>

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving}  />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
