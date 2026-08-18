import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { WizardFlow, SummaryRow, ResultCard, PhotoButton, Button, Card } from '@/components/ui';
import { Colors, sacos, decimal } from '@/constants';
import { bombonaTotalSteps } from '@/lib/bombona';
import { NSA } from '@/theme/nsa';
import { completeRequestFor } from '@/lib/inspection-requests';

export default function BombonaSummary() {
  const { paddockId } = useLocalSearchParams();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const store = useRondaStore();
  const { bombona } = store;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeSacks = Number.isFinite(bombona.sacks) ? bombona.sacks : 0;
  const safeKgPerSack = Number.isFinite(bombona.kgPerSack) ? bombona.kgPerSack : 0;
  const totalKg = safeSacks * safeKgPerSack;
  const totalSteps = bombonaTotalSteps(bombona);
  const exp = bombona.expected;
  const realSacks = bombona.hasStock ? safeSacks : 0;
  const diff = exp ? realSacks - exp.expectedSacks : 0;

  /**
   * Contagem da ronda vira evento de estoque. É o único jeito de corrigir: no
   * servidor `inventory.quantity_sacks` é derivado da soma de
   * `inventory_events` (trigger `inventory_force_ledger`), então um saldo
   * "cru" pushado é ignorado — o evento É o saldo.
   *
   * `last_resupply_date` é re-ancorado junto porque é o marco de onde a conta
   * de consumo parte. Sem isso, a próxima ronda tornaria a descontar todos os
   * abastecimentos antigos do saldo recém-corrigido e o número erraria de novo
   * no dia seguinte.
   */
  async function reconcileStock() {
    const pid = Number(paddockId);
    const uid = user?.id ?? null;

    async function writeEvent(formulaId: number, delta: number, reason: string) {
      await db.runAsync(
        `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
         VALUES ('CONTAGEM_BOMBONA', ?, ?, ?, ?, ?)`,
        [formulaId, pid, delta, reason, uid]
      );
    }

    // "Não tem ração" vale para a bombona inteira, não só para a fórmula que
    // ele escolheria depois — zera todas as que ainda tinham saldo.
    if (!bombona.hasStock) {
      const rows = await db.getAllAsync<{ id: number; formula_id: number; quantity_sacks: number }>(
        `SELECT id, formula_id, quantity_sacks FROM inventory
         WHERE location = 'bombona' AND paddock_id = ? AND quantity_sacks > 0`,
        [pid]
      );
      for (const r of rows) {
        await writeEvent(r.formula_id, -r.quantity_sacks, 'Contagem na ronda: bombona vazia');
        await db.runAsync(
          `UPDATE inventory SET quantity_sacks = 0, last_resupply_date = date('now','localtime') WHERE id = ?`,
          [r.id]
        );
      }
      return;
    }

    if (!bombona.formulaId) return;

    const row = await db.getFirstAsync<{ id: number; quantity_sacks: number }>(
      `SELECT id, quantity_sacks FROM inventory
       WHERE location = 'bombona' AND paddock_id = ? AND formula_id = ?`,
      [pid, bombona.formulaId]
    );
    const current = row?.quantity_sacks ?? 0;
    const delta = realSacks - current;
    if (delta === 0) return;

    const reason = exp
      ? `Contagem na ronda: ${sacos(realSacks)} (sistema calculava ${decimal(exp.expectedSacks)})`
      : `Contagem na ronda: ${sacos(realSacks)}`;
    await writeEvent(bombona.formulaId, delta, reason);

    if (row) {
      await db.runAsync(
        `UPDATE inventory SET quantity_sacks = ?, last_resupply_date = date('now','localtime') WHERE id = ?`,
        [realSacks, row.id]
      );
    } else {
      // Ração que o sistema não sabia que existia — cria a bombona do piquete.
      await db.runAsync(
        `INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location, paddock_id, last_resupply_date)
         VALUES (?, ?, 2, 'bombona', ?, date('now','localtime'))`,
        [bombona.formulaId, realSacks, pid]
      );
    }
  }

  async function handleSave() {
    if (!store.currentRondaId) {
      Alert.alert('Erro', 'Ronda não iniciada. Volte pro menu e reinicie a ronda.');
      return;
    }
    setSaving(true);

    const hasStockInt = bombona.hasStock ? 1 : 0;
    const formulaIdSafe = bombona.hasStock ? (bombona.formulaId ?? null) : null;
    const sacksSafe = bombona.hasStock ? safeSacks : null;

    if (__DEV__) console.log('[summary-save]', {
      wizard: 'bombona',
      rondaId: store.currentRondaId,
      hasStock: bombona.hasStock,
      formulaId: bombona.formulaId,
      formulaName: bombona.formulaName,
      sacks: bombona.sacks,
      kgPerSack: bombona.kgPerSack,
      expectedSacks: exp?.expectedSacks ?? null,
      matchesExpected: bombona.matchesExpected,
      photo,
      insertValues: [store.currentRondaId, hasStockInt, formulaIdSafe, sacksSafe, photo],
    });

    try {
      // Avaliação e correção de estoque em uma transação: uma contagem gravada
      // sem o evento correspondente deixaria o saldo mentindo até a próxima.
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO bombona_evals (ronda_id, has_stock, formula_id, sacks, photo_uri) VALUES (?, ?, ?, ?, ?)`,
          [store.currentRondaId, hasStockInt, formulaIdSafe, sacksSafe, photo]
        );
        await reconcileStock();
      });
      if (user && paddockId) {
        await completeRequestFor(db, Number(paddockId), 'bombona', user.id);
      }
      router.replace(`/ronda/${paddockId}/menu`);
    } catch (err) {
      if (__DEV__) console.error('[summary-save-error]', { wizard: 'bombona', err });
      Alert.alert('Erro', 'Falha ao salvar avaliação de bombona. Tente novamente.');
    }
    setSaving(false);
  }

  return (
    <WizardFlow
      title="Bombona"
      subtitle={store.currentPaddockName || ''}
      step={totalSteps}
      totalSteps={totalSteps}
      accentColor={Colors.bombona}
      onBack={() => router.back()}
    >
      {bombona.hasStock ? (
        <ResultCard
          value={sacos(safeSacks)}
          label={`${decimal(totalKg)} kg ${bombona.formulaName || ''}`}
          color={safeSacks > 0 ? NSA.ok : NSA.warn}
        />
      ) : (
        <ResultCard
          value="Bombona vazia"
          label="Reabastecer"
          color={NSA.danger}
        />
      )}

      <Card>
        <SummaryRow label="Tem estoque" value={bombona.hasStock ? 'Sim' : 'Não'} />
        {bombona.hasStock && (
          <>
            <SummaryRow label="Formulação" value={bombona.formulaName || '-'} />
            {exp && <SummaryRow label="Sistema calculava" value={sacos(exp.expectedSacks)} />}
            <SummaryRow label="Contagem" value={sacos(safeSacks)} />
            {exp && diff !== 0 && (
              <SummaryRow
                label="Correção do estoque"
                value={`${diff > 0 ? '+' : '−'}${sacos(Math.abs(diff))}`}
                valueColor={diff > 0 ? NSA.ok : NSA.danger}
              />
            )}
            <SummaryRow label="Total" value={`${decimal(totalKg)} kg`} />
          </>
        )}
      </Card>

      <PhotoButton uri={photo} onPhoto={setPhoto} />
      <Button title={saving ? 'Salvando…' : 'Finalizar'} onPress={handleSave} disabled={saving} />
    </WizardFlow>
  );
}

const styles = StyleSheet.create({
});
