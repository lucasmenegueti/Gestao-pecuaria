import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors, classifyFence, FENCE_CLASSIFICATION } from '@/constants';

export default function FenceSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { fence } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const classification = classifyFence(fence.voltage);
  const classInfo = FENCE_CLASSIFICATION[classification];

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        'INSERT INTO fence_evals (ronda_id, voltage, is_electric, prevents_mixing, classification, photo_uri) VALUES (?, ?, ?, ?, ?, ?)',
        [store.currentRondaId, fence.voltage, fence.isElectric ? 1 : 0, fence.preventsMixing ? 1 : 0, classification, photo]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="CERCA"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.cerca}
      onBack={() => router.back()}
    >
      <ResultCard
        icon="⚡"
        value={fence.isElectric ? `${fence.voltage.toLocaleString('pt-BR')}V` : 'N/A'}
        label={`CHOQUE ${classification}`}
        sublabel={fence.isElectric ? `(≥${FENCE_CLASSIFICATION[classification].min}V)` : 'Cerca não elétrica'}
        color={classInfo.color}
      />

      <View style={styles.summaryBox}>
        <SummaryRow label="Voltagem" value={fence.isElectric ? `${fence.voltage.toLocaleString('pt-BR')}V` : 'N/A'} />
        <SummaryRow label="Classificação" value={classification} valueColor={classInfo.color} />
        <SummaryRow label="Evita mistura" value={fence.preventsMixing ? '✅ SIM' : '❌ NÃO'} />
      </View>

      <View style={styles.referenceCard}>
        <Text style={styles.refTitle}>Referência:</Text>
        <Text style={styles.refItem}>🟢 Forte: ≥4.000V</Text>
        <Text style={styles.refItem}>🟡 Adequado: 2.000 - 3.999V</Text>
        <Text style={styles.refItem}>🔴 Fraco: 1 - 1.999V</Text>
        <Text style={styles.refItem}>⚪ Sem choque: 0V</Text>
      </View>

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'SALVANDO...' : 'FINALIZAR ✅'} onPress={handleSave} disabled={saving} variant="success" size="large" style={{ marginTop: 24 }} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2 },
  referenceCard: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 16, marginTop: 16 },
  refTitle: { fontSize: 14, fontWeight: '700', color: '#2c2c2c', marginBottom: 8 },
  refItem: { fontSize: 14, color: '#2c2c2c', marginTop: 2 },
});
