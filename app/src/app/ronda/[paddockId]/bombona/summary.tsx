import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, sacos } from '@/constants';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function BombonaSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { bombona } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeSacks = Number.isFinite(bombona.sacks) ? bombona.sacks : 0;
  const safeKgPerSack = Number.isFinite(bombona.kgPerSack) ? bombona.kgPerSack : 0;
  const totalKg = safeSacks * safeKgPerSack;
  const step = bombona.hasStock ? 4 : 2;
  const totalSteps = bombona.hasStock ? 4 : 2;

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const hasStockInt = bombona.hasStock ? 1 : 0;
    const formulaIdSafe = bombona.hasStock ? (bombona.formulaId ?? null) : null;
    const sacksSafe = bombona.hasStock
      ? (Number.isFinite(bombona.sacks) ? bombona.sacks : 0)
      : null;

    if (__DEV__) console.log('[summary-save]', {
      wizard: 'bombona',
      rondaId: store.currentRondaId,
      hasStock: bombona.hasStock,
      formulaId: bombona.formulaId,
      formulaName: bombona.formulaName,
      sacks: bombona.sacks,
      kgPerSack: bombona.kgPerSack,
      photo,
      insertValues: [store.currentRondaId, hasStockInt, formulaIdSafe, sacksSafe, photo],
    });

    try {
      await db.runAsync(
        `INSERT INTO bombona_evals (ronda_id, has_stock, formula_id, sacks, photo_uri) VALUES (?, ?, ?, ?, ?)`,
        [
          store.currentRondaId,
          hasStockInt,
          formulaIdSafe,
          sacksSafe,
          photo,
        ]
      );
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'bombona', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      if (__DEV__) console.error('[summary-save-error]', { wizard: 'bombona', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de bombona. Tente novamente.');
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
          value={sacos(safeSacks)}
          label={`${totalKg} kg ${bombona.formulaName || ''}`}
          color={safeSacks > 0 ? NSA.ok : NSA.warn}
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
            <SummaryRow label="Sacos" value={sacos(safeSacks)} />
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
