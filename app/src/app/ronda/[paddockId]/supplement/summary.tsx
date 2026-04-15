import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button } from '@/components/ui';
import { Colors, calculateSupplementDays } from '@/constants';

export default function SupplementSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { supplement } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const troughDays = supplement.restocked && supplement.formulaId
    ? calculateSupplementDays(supplement.sacksInTrough, supplement.kgPerSack, store.currentPaddockHeads, supplement.consumptionGPerDay)
    : 0;

  async function handleSave() {
    if (!store.currentRondaId) return;
    setSaving(true);
    try {
      await db.runAsync(
        `INSERT INTO supplement_evals (ronda_id, trough_score, restocked, formula_id, sacks_in_trough, trough_access, photo_uri)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          store.currentRondaId,
          supplement.troughScore,
          supplement.restocked ? 1 : 0,
          supplement.formulaId,
          supplement.sacksInTrough,
          supplement.troughAccess,
          photo,
        ]
      );
      router.push(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar avaliação');
    }
    setSaving(false);
  }

  const scoreColor = supplement.troughScore === 'CHEIO' ? Colors.success : supplement.troughScore === 'ADEQUADA' ? Colors.warning : Colors.danger;

  return (
    <WizardFlow
      title="SUPLEMENTAÇÃO"
      subtitle={`${store.currentPaddockName} • ${store.currentPaddockHeads} cabeças`}
      step={6}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
    >
      <View style={styles.summaryBox}>
        <SummaryRow label="Escore do cocho" value={supplement.troughScore || '-'} valueColor={scoreColor} />
        <SummaryRow label="Abasteceu" value={supplement.restocked ? '✅ SIM' : '❌ NÃO'} />
        {supplement.formulaName && <SummaryRow label="Formulação" value={supplement.formulaName} />}
        {supplement.restocked && <SummaryRow label="Sacos no cocho" value={`${supplement.sacksInTrough} sacos`} />}
        <SummaryRow label="Acesso ao cocho" value={supplement.troughAccess || '-'} valueColor={supplement.troughAccess === 'BOM' ? Colors.success : Colors.danger} />
      </View>

      <ResultCard
        icon="⏱️"
        value={`~${troughDays} DIAS`}
        label="PREVISÃO DO COCHO"
        color={troughDays > 7 ? Colors.success : troughDays > 3 ? Colors.warning : Colors.danger}
      />

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
