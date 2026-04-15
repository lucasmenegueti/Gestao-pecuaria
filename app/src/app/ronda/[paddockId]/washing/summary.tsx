import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, Button } from '@/components/ui';
import { Colors } from '@/constants';

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
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="LAVAGEM"
      subtitle={store.currentPaddockName || ''}
      step={3}
      totalSteps={3}
      accentColor={Colors.lavagem}
      onBack={() => router.back()}
    >
      <ResultCard
        icon="🚿"
        value="LAVAGEM REGISTRADA"
        label="Bebedouro limpo ✓"
        color={Colors.success}
      />

      <View style={styles.summaryBox}>
        <SummaryRow label="Data" value={new Date().toLocaleDateString('pt-BR')} />
        <SummaryRow label="Foto" value={washing.photoUri ? '📸 Anexada' : 'Sem foto'} />
      </View>

      <Button
        title={saving ? 'SALVANDO...' : 'CONFIRMAR ✅'}
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
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2, marginTop: 16 },
});
