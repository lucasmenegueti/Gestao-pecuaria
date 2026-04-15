import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors } from '@/constants';

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
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar avaliação');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="BOMBONA"
      subtitle={store.currentPaddockName || ''}
      step={step}
      totalSteps={totalSteps}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
    >
      {bombona.hasStock ? (
        <ResultCard
          icon="🛢️"
          value={`${bombona.sacks} SACOS`}
          label={`${totalKg} kg ${bombona.formulaName || ''}`}
          color={bombona.sacks > 0 ? Colors.success : Colors.warning}
        />
      ) : (
        <ResultCard
          icon="⚠️"
          value="BOMBONA VAZIA"
          label="Reabastecer"
          color={Colors.danger}
        />
      )}

      <View style={styles.summaryBox}>
        <SummaryRow label="Tem estoque" value={bombona.hasStock ? '✅ SIM' : '❌ NÃO'} />
        {bombona.hasStock && (
          <>
            <SummaryRow label="Formulação" value={bombona.formulaName || '-'} />
            <SummaryRow label="Sacos" value={`${bombona.sacks} sacos`} />
            <SummaryRow label="Total" value={`${totalKg} kg`} />
          </>
        )}
      </View>

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'} onPress={handleSave} disabled={saving} variant="success" size="large" style={{ marginTop: 24 }} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2 },
});
