import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors, calculateForageAverage } from '@/constants';

export default function ForageSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { forage } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const avg = calculateForageAverage(forage.measure1, forage.measure2, forage.measure3);

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        `INSERT INTO forage_evals (ronda_id, measurement_type, measure_1_cm, measure_2_cm, measure_3_cm, average_cm, quality, photo_uri)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [store.currentRondaId, forage.measurementType, forage.measure1, forage.measure2, forage.measure3, avg, forage.quality, photo]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="FORRAGEM"
      subtitle={`${store.currentPaddockName} • ${forage.measurementType} • ${store.currentGrassTypeName}`}
      step={6}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
    >
      <View style={styles.summaryBox}>
        <SummaryRow label="1ª medida" value={`${forage.measure1} cm`} />
        <SummaryRow label="2ª medida" value={`${forage.measure2} cm`} />
        <SummaryRow label="3ª medida" value={`${forage.measure3} cm`} />
      </View>

      <ResultCard
        value={`${avg} cm`}
        label="MÉDIA"
        color={avg >= 40 ? Colors.success : avg >= 20 ? Colors.warning : Colors.danger}
      />

      <View style={styles.summaryBox}>
        <SummaryRow label="Qualidade" value={forage.quality || '-'} valueColor={forage.quality === 'BOM' ? Colors.success : forage.quality === 'REGULAR' ? Colors.warning : Colors.danger} />
      </View>

      <PhotoButton uri={photo} onPhoto={setPhoto} />

      <Button
        title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'}
        onPress={handleSave}
        disabled={saving}
        variant="success"
        size="large"
        style={{ marginTop: 24 }}
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
