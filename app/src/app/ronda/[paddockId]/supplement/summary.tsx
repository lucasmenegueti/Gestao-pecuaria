import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, calculateSupplementDays, dailyConsumptionKg } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function SupplementSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const store = useRondaStore();
  const { supplement } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lots, setLots] = useState<Array<{ category: string; head_count: number; avg_weight_kg: number | null }>>([]);

  useEffect(() => {
    db.getAllAsync<{ category: string; head_count: number; avg_weight_kg: number | null }>(
      'SELECT category, head_count, avg_weight_kg FROM herd WHERE paddock_id = ?',
      [Number(paddockId)]
    ).then(setLots);
  }, [paddockId]);

  // consumptionGPerDay agora é g/kg PV/dia (renomeado mas mantido no store)
  const troughDays = supplement.restocked && supplement.formulaId
    ? calculateSupplementDays(
        supplement.sacksInTrough,
        supplement.kgPerSack,
        dailyConsumptionKg(lots, supplement.consumptionGPerDay),
      )
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
      router.replace('/(tabs)/ronda');
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar avaliação');
    }
    setSaving(false);
  }

  const scoreColor = supplement.troughScore === 'CHEIO' ? NSA.ok : supplement.troughScore === 'ADEQUADA' ? NSA.warn : NSA.danger;

  return (
    <WizardFlow
      title="Suplementação"
      subtitle={`${store.currentPaddockName} • ${store.currentPaddockHeads} cabeças`}
      step={6}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
    >
      <Card>
        <SummaryRow label="Escore do cocho" value={supplement.troughScore || '-'} valueColor={scoreColor} />
        <SummaryRow label="Abasteceu" value={supplement.restocked ? 'Sim' : 'Não'} />
        {supplement.formulaName && <SummaryRow label="Formulação" value={supplement.formulaName} />}
        {supplement.restocked && <SummaryRow label="Sacos no cocho" value={`${supplement.sacksInTrough} sacos`} />}
        <SummaryRow label="Acesso ao cocho" value={supplement.troughAccess || '-'} valueColor={supplement.troughAccess === 'BOM' ? NSA.ok : NSA.danger} />
      </Card>

      <ResultCard
        value={`~${troughDays} DIAS`}
        label="PREVISÃO DO COCHO"
        color={troughDays > 7 ? NSA.ok : troughDays > 3 ? NSA.warn : NSA.danger}
      />

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
