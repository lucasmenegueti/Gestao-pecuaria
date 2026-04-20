import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, calculateForageAverage } from '@/constants';
import { NSA } from '@/theme/nsa';

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
      router.dismissAll();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Forragem"
      subtitle={`${store.currentPaddockName} • ${forage.measurementType} • ${store.currentGrassTypeName}`}
      step={6}
      totalSteps={6}
      accentColor={Colors.forragem}
      onBack={() => router.back()}
    >
      <Card>
        <SummaryRow label="1ª medida" value={`${forage.measure1} cm`} />
        <SummaryRow label="2ª medida" value={`${forage.measure2} cm`} />
        <SummaryRow label="3ª medida" value={`${forage.measure3} cm`} />
      </Card>

      <ResultCard
        value={`${avg} cm`}
        label="MÉDIA"
        color={avg >= 40 ? NSA.ok : avg >= 20 ? NSA.warn : NSA.danger}
      />

      <Card>
        <SummaryRow label="Qualidade" value={forage.quality || '-'} valueColor={forage.quality === 'BOM' ? NSA.ok : forage.quality === 'REGULAR' ? NSA.warn : NSA.danger} />
      </Card>

      <PhotoButton uri={photo} onPhoto={setPhoto} />

      <Button
        title={saving ? 'Salvando…' : 'Finalizar'}
        onPress={handleSave}
        disabled={saving}
        
      />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({});
