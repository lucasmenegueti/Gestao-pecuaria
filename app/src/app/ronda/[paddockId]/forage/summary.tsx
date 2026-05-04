import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, calculateForageAverage } from '@/constants';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function ForageSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { forage } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rawAvg = calculateForageAverage(forage.measure1, forage.measure2, forage.measure3);
  const avg = Number.isFinite(rawAvg) ? rawAvg : 0;

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const m1 = Number.isFinite(forage.measure1) ? forage.measure1 : 0;
    const m2 = Number.isFinite(forage.measure2) ? forage.measure2 : 0;
    const m3 = Number.isFinite(forage.measure3) ? forage.measure3 : 0;
    const avgSafe = Number.isFinite(avg) ? avg : 0;
    const measurementType = forage.measurementType || 'ENTRADA';
    const quality = forage.quality || 'REGULAR';

    console.log('[summary-save]', {
      wizard: 'forage',
      rondaId: store.currentRondaId,
      measurementType: forage.measurementType,
      measure1: forage.measure1,
      measure2: forage.measure2,
      measure3: forage.measure3,
      rawAvg,
      quality: forage.quality,
      photo,
      insertValues: [store.currentRondaId, measurementType, m1, m2, m3, avgSafe, quality, photo],
    });

    try {
      await db.runAsync(
        `INSERT INTO forage_evals (ronda_id, measurement_type, measure_1_cm, measure_2_cm, measure_3_cm, average_cm, quality, photo_uri)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [store.currentRondaId, measurementType, m1, m2, m3, avgSafe, quality, photo]
      );
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'forragem', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      console.error('[summary-save-error]', { wizard: 'forage', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de forragem. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Forragem"
      subtitle={`${store.currentPaddockName ?? '—'} • ${forage.measurementType ?? '—'} • ${store.currentGrassTypeName ?? '—'}`}
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
