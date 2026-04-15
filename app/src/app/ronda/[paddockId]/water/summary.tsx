import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors } from '@/constants';

export default function WaterSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { water } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO water_evals (ronda_id, available, quality, photo_uri) VALUES (?, ?, ?, ?)',
        [store.currentRondaId, water.available ? 1 : 0, water.quality, photo]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  const isOk = water.available && (water.quality === 'EXCELENTE' || water.quality === 'BOA');

  return (
    <WizardFlow
      title="AGUADA"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.aguada}
      onBack={() => router.back()}
    >
      <View style={styles.summaryBox}>
        <SummaryRow label="Água disponível" value={water.available ? '✅ SIM' : '❌ NÃO'} />
        <SummaryRow label="Qualidade" value={water.quality || '-'} />
      </View>

      <ResultCard
        icon="💧"
        value={isOk ? 'AGUADA OK' : 'ATENÇÃO'}
        label={water.quality || ''}
        color={isOk ? Colors.success : Colors.danger}
      />

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'} onPress={handleSave} disabled={saving} variant="success" size="large" style={{ marginTop: 24 }} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2 },
});
