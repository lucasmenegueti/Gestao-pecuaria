import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { settleBombona, type SettledBombona } from '@/lib/bombona';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, calculateSupplementDays, dailyConsumptionKg, sacos, cabecas } from '@/constants';
import { NSA } from '@/theme/nsa';

export default function SupplementSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
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

  // consumptionGPerDay é g por CABEÇA/dia (o nome da coluna no DB mente — ver CLAUDE.md)
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
      // Avaliação + débito da bombona na mesma transação. Ordem importa:
      // settleBombona ANTES do INSERT — a liquidação move a âncora pra hoje, e
      // só assim a avaliação recém-inserida (r.date = hoje) fica fora da conta
      // `r.date > âncora` do loadBombonaExpectations. Inserir antes debitaria
      // os mesmos sacos duas vezes (uma no evento, outra na ponte da leitura).
      const debitsBombona =
        supplement.restocked && supplement.formulaId != null && supplement.sacksInTrough > 0;
      await db.withTransactionAsync(async () => {
        let settled: SettledBombona | null = null;
        if (debitsBombona) {
          settled = await settleBombona(db, Number(paddockId), supplement.formulaId!, user?.id ?? null);
        }
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
        // Sem bombona cadastrada (ração veio direto do trator) não há o que
        // debitar — a avaliação fica registrada e a conta segue como antes.
        if (debitsBombona && settled) {
          await db.runAsync(
            `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
             VALUES ('CONSUMO_COCHO', ?, ?, ?, ?, ?)`,
            [supplement.formulaId, Number(paddockId), -supplement.sacksInTrough, 'Suplementação na ronda', user?.id ?? null]
          );
          await db.runAsync(
            `UPDATE inventory SET quantity_sacks = ? WHERE id = ?`,
            [Math.max(0, settled.expectedSacks - supplement.sacksInTrough), settled.inventoryId]
          );
        }
      });
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar avaliação');
    }
    setSaving(false);
  }

  const scoreColor = supplement.troughScore === 'CHEIO' ? NSA.ok : supplement.troughScore === 'ADEQUADA' ? NSA.warn : NSA.danger;

  return (
    <WizardFlow
      title="Suplementação"
      subtitle={`${store.currentPaddockName} • ${cabecas(store.currentPaddockHeads)}`}
      step={6}
      totalSteps={6}
      accentColor={Colors.suplementacao}
      onBack={() => router.back()}
    >
      <Card>
        <SummaryRow label="Escore do cocho" value={supplement.troughScore || '-'} valueColor={scoreColor} />
        <SummaryRow label="Abasteceu" value={supplement.restocked ? 'Sim' : 'Não'} />
        {supplement.formulaName && <SummaryRow label="Formulação" value={supplement.formulaName} />}
        {supplement.restocked && <SummaryRow label="Sacos no cocho" value={sacos(supplement.sacksInTrough)} />}
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
