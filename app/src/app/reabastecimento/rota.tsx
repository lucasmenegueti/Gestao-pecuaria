import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Truck, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, BrandHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { NSA, Fonts, Radius } from '@/theme/nsa';
import { cancelActiveRoute } from '@/lib/reabastecimento/active-route';
import { sacos } from '@/constants';

interface LoadInfo {
  formula_id: number;
  formula_name: string;
  loaded: number;
  distributed: number;
  remaining: number;
}

interface PaddockRow {
  paddock_id: number;
  paddock_name: string;
  bombonas: Array<{ formula_id: number; formula_name: string; db_sacks: number }>;
  delivered_to_here: number;
}

interface DeliveryForm {
  paddockId: number;
  paddockName: string;
  formulaId: number;
  /** Estoque atual conhecido (não editável direto — só ajuste manual via botão). */
  currentDbSacks: number;
  /** Ajuste manual (negativo = perda, positivo = recontagem). */
  manualAdjust: number;
  showManualAdjust: boolean;
  toDeliver: number;
}

export default function RotaScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [loads, setLoads] = useState<LoadInfo[]>([]);
  const [paddocks, setPaddocks] = useState<PaddockRow[]>([]);
  const [delivering, setDelivering] = useState<DeliveryForm | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // BUG #20/#21: calcula distribuído a partir do SUM de deliveries (fonte da
    // verdade) em vez de confiar em rl.sacks_distributed, que pode estar
    // desatualizado (sync remoto não propaga o UPDATE). Sem isso o header "No
    // trator" e o "disp" dos chips mostram os valores iniciais ignorando as
    // entregas já feitas. Mesmo padrão aplicado em resumo.tsx:loadSummary.
    const loadRows = await db.getAllAsync<{
      formula_id: number;
      name: string;
      sacks_loaded: number;
      sacks_distributed: number;
    }>(
      `SELECT rl.formula_id, f.name, rl.sacks_loaded,
              COALESCE((
                SELECT SUM(rd.sacks_delivered)
                FROM resupply_deliveries rd
                WHERE rd.route_id = rl.route_id
                  AND rd.formula_id = rl.formula_id
                  AND rd.deleted_at IS NULL
              ), 0) AS sacks_distributed
       FROM resupply_loads rl JOIN formulas f ON f.id=rl.formula_id
       WHERE rl.route_id=? AND rl.deleted_at IS NULL`,
      [Number(routeId)]
    );
    setLoads(
      loadRows.map((r) => ({
        formula_id: r.formula_id,
        formula_name: r.name,
        loaded: r.sacks_loaded,
        distributed: r.sacks_distributed,
        remaining: Math.max(0, r.sacks_loaded - r.sacks_distributed),
      }))
    );

    const paddockRows = await db.getAllAsync<{ id: number; name: string }>(
      `SELECT id, name FROM paddocks WHERE active=1 AND deleted_at IS NULL ORDER BY name`
    );

    const bombonaRows = await db.getAllAsync<{
      paddock_id: number;
      formula_id: number;
      formula_name: string;
      quantity_sacks: number;
    }>(
      `SELECT i.paddock_id, i.formula_id, f.name as formula_name, i.quantity_sacks
       FROM inventory i JOIN formulas f ON f.id=i.formula_id
       WHERE i.location='bombona' AND i.deleted_at IS NULL`
    );
    const bombMap = new Map<number, PaddockRow['bombonas']>();
    bombonaRows.forEach((b) => {
      const arr = bombMap.get(b.paddock_id) || [];
      arr.push({ formula_id: b.formula_id, formula_name: b.formula_name, db_sacks: b.quantity_sacks });
      bombMap.set(b.paddock_id, arr);
    });

    const delivRows = await db.getAllAsync<{ paddock_id: number; total: number }>(
      `SELECT paddock_id, SUM(sacks_delivered) as total FROM resupply_deliveries
       WHERE route_id=? AND deleted_at IS NULL GROUP BY paddock_id`,
      [Number(routeId)]
    );
    const delivMap = new Map(delivRows.map((d) => [d.paddock_id, d.total]));

    setPaddocks(
      paddockRows.map((p) => ({
        paddock_id: p.id,
        paddock_name: p.name,
        bombonas: bombMap.get(p.id) || [],
        delivered_to_here: delivMap.get(p.id) || 0,
      }))
    );
  }

  function openDelivery(p: PaddockRow) {
    // BUG #19: preferir a fórmula da bombona existente (que é o que aparece no
    // header do card) para que `currentDbSacks` bata com o "Probeef X · 15
    // sacos" exibido. Antes, o default era a primeira fórmula do trator, que
    // podia não ter bombona nesse piquete → painel mostrava "Estoque atual: 0"
    // mesmo com o header dizendo 15.
    // Ordem de preferência:
    //   1. Fórmula da bombona existente que AINDA tem carga no trator
    //   2. Qualquer carga do trator com remaining > 0
    //   3. Primeira carga do trator (fallback, mesmo com remaining 0)
    //   4. Primeira bombona existente (quando o trator está vazio)
    const bombonaWithLoad = p.bombonas.find((b) =>
      loads.some((l) => l.formula_id === b.formula_id && l.remaining > 0)
    );
    const firstBombona = p.bombonas[0];
    const firstLoadRemaining = loads.find((l) => l.remaining > 0);
    const firstLoad = loads[0];
    const formulaId =
      bombonaWithLoad?.formula_id ??
      firstLoadRemaining?.formula_id ??
      firstBombona?.formula_id ??
      firstLoad?.formula_id;
    if (!formulaId) {
      Alert.alert('Sem ração', 'Não há ração no trator.');
      return;
    }
    const existing = p.bombonas.find((b) => b.formula_id === formulaId);
    const load = loads.find((l) => l.formula_id === formulaId);
    setDelivering({
      paddockId: p.paddock_id,
      paddockName: p.paddock_name,
      formulaId,
      currentDbSacks: existing?.db_sacks ?? 0,
      manualAdjust: 0,
      showManualAdjust: false,
      toDeliver: Math.min(load?.remaining ?? 0, 5),
    });
  }

  function switchFormula(formulaId: number) {
    if (!delivering) return;
    const paddock = paddocks.find((p) => p.paddock_id === delivering.paddockId);
    const existing = paddock?.bombonas.find((b) => b.formula_id === formulaId);
    const load = loads.find((l) => l.formula_id === formulaId);
    setDelivering({
      ...delivering,
      formulaId,
      currentDbSacks: existing?.db_sacks ?? 0,
      manualAdjust: 0,
      showManualAdjust: false,
      toDeliver: Math.min(load?.remaining ?? 0, 5),
    });
  }

  async function handleConfirm() {
    if (!delivering) return;
    const load = loads.find((l) => l.formula_id === delivering.formulaId);
    const remaining = load?.remaining ?? 0;
    if (delivering.toDeliver > remaining) {
      Alert.alert('Sem ração', `Disponível apenas ${sacos(remaining)} desta fórmula no trator.`);
      return;
    }
    try {
      // Nova quantidade = (estoque DB + ajuste manual) + o que foi entregue agora.
      // Ajuste manual (positivo ou negativo) é contabilizado como evento separado.
      const adjustedCurrent = delivering.currentDbSacks + delivering.manualAdjust;
      const newTotal = adjustedCurrent + delivering.toDeliver;

      const existing = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM inventory WHERE paddock_id=? AND formula_id=? AND location='bombona'`,
        [delivering.paddockId, delivering.formulaId]
      );
      if (existing) {
        await db.runAsync(
          `UPDATE inventory SET quantity_sacks=?, last_resupply_date=date('now','localtime') WHERE id=?`,
          [newTotal, existing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location, paddock_id, last_resupply_date)
           VALUES (?, ?, 2, 'bombona', ?, date('now','localtime'))`,
          [delivering.formulaId, newTotal, delivering.paddockId]
        );
      }

      if (delivering.toDeliver > 0) {
        await db.runAsync(
          `INSERT INTO resupply_deliveries (route_id, paddock_id, formula_id, sacks_delivered)
           VALUES (?,?,?,?)`,
          [Number(routeId), delivering.paddockId, delivering.formulaId, delivering.toDeliver]
        );
        await db.runAsync(
          `UPDATE resupply_loads SET sacks_distributed = sacks_distributed + ?
           WHERE route_id=? AND formula_id=?`,
          [delivering.toDeliver, Number(routeId), delivering.formulaId]
        );
        await db.runAsync(
          `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['ENTREGA_BOMBONA', delivering.formulaId, delivering.paddockId, delivering.toDeliver, `Rota #${routeId}`, user?.id ?? null]
        );
      }

      // Ajuste manual vira evento de perda (ou recontagem)
      if (delivering.manualAdjust !== 0) {
        await db.runAsync(
          `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['AJUSTE_PERDA_BOMBONA', delivering.formulaId, delivering.paddockId, delivering.manualAdjust, 'Ajuste na rota de reabastecimento', user?.id ?? null]
        );
      }

      setDelivering(null);
      loadData();
    } catch (err) {
      if (__DEV__) console.error('[rota] falha', err);
      Alert.alert('Erro', String((err as Error)?.message ?? 'Falha na entrega'));
    }
  }

  function handleCancelRoute() {
    const total = loads.reduce((s, l) => s + l.remaining, 0);
    Alert.alert(
      'Cancelar rota?',
      total > 0
        ? `${sacos(total)} voltam ao estoque central. As entregas já feitas nas bombonas continuam.`
        : 'Não há sacos no trator. A rota será finalizada como cancelada.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar rota',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar',
              'Tem certeza? Os sacos voltam à central e essa rota não pode mais ser retomada.',
              [
                { text: 'Não', style: 'cancel' },
                {
                  text: 'Sim, cancelar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await cancelActiveRoute(db, Number(routeId), user?.id ?? null);
                      router.replace('/(tabs)/estoque');
                    } catch (err) {
                      if (__DEV__) console.error('[rota] cancelar falhou', err);
                      Alert.alert('Erro', 'Falha ao cancelar rota.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const totalRemaining = loads.reduce((s, l) => s + l.remaining, 0);
  const abastecidos = paddocks.filter((p) => p.delivered_to_here > 0).length;
  const q = search.trim().toLowerCase();
  const filteredPaddocks = q
    ? paddocks.filter((p) => p.paddock_name.toLowerCase().includes(q))
    : paddocks;

  return (
    <View style={styles.root}>
      <BrandHeader
        title="Rota em andamento"
        context="Fase 2 · Reabastecimento"
        fallback="/(tabs)/estoque"
        right={
          <TouchableOpacity onPress={handleCancelRoute} hitSlop={8} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.tratorBar}>
        <View style={styles.tratorHeader}>
          <Truck size={14} color={NSA.green800} strokeWidth={1.75} />
          <Text style={styles.tratorLabel}>NO TRATOR</Text>
        </View>
        {loads.map((l) => (
          <View key={l.formula_id} style={styles.tratorRow}>
            <Text style={styles.tratorName}>{l.formula_name}</Text>
            <Text style={styles.tratorQty}>
              <Text style={styles.tratorQtyBold}>{l.remaining}</Text> / {l.loaded} sacos
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.listTitle}>
          PIQUETES · {abastecidos}/{paddocks.length} abastecidos
        </Text>

        <View style={styles.searchWrap}>
          <Search size={16} color={NSA.inkMuted} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar piquete"
            placeholderTextColor={NSA.inkDisabled}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear} hitSlop={10}>
              <X size={14} color={NSA.inkMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          )}
        </View>

        {filteredPaddocks.length === 0 && (
          <Text style={styles.noMatch}>Nenhum piquete encontrado para "{search}".</Text>
        )}

        {filteredPaddocks.map((p) => {
          const isOpen = delivering?.paddockId === p.paddock_id;
          const delivered = p.delivered_to_here > 0;
          return (
            <Card key={p.paddock_id} borderColor={delivered ? NSA.ok : undefined}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.paddock_name}</Text>
                  {p.bombonas.length === 0 ? (
                    <Text style={styles.itemDetailMuted}>Sem bombona — será criada ao entregar</Text>
                  ) : (
                    p.bombonas.map((b) => (
                      <Text key={b.formula_id} style={styles.itemDetail}>
                        {b.formula_name} · {sacos(b.db_sacks)}
                      </Text>
                    ))
                  )}
                  {delivered && (
                    <View style={styles.deliveredRow}>
                      <CheckCircle2 size={14} color={NSA.green800} strokeWidth={1.75} />
                      <Text style={styles.deliveredText}>Abastecido nesta rota · +{p.delivered_to_here}</Text>
                    </View>
                  )}
                </View>
              </View>

              {!isOpen && (
                <Button
                  title={delivered ? 'Abastecer mais / ajustar' : 'Abastecer / ajustar'}
                  variant={delivered ? 'outline' : 'primary'}
                  onPress={() => openDelivery(p)}
                  disabled={totalRemaining === 0 && !delivered}
                  style={{ marginTop: 10 }}
                />
              )}

              {isOpen && delivering && (
                <View style={styles.deliverForm}>
                  <Text style={styles.formLabel}>Fórmula</Text>
                  <View style={styles.formulaRow}>
                    {loads.map((l) => {
                      const sel = l.formula_id === delivering.formulaId;
                      return (
                        <TouchableOpacity
                          key={l.formula_id}
                          style={[styles.formulaChip, sel && styles.formulaChipSel]}
                          onPress={() => switchFormula(l.formula_id)}
                        >
                          <Text style={[styles.formulaChipText, sel && styles.formulaChipTextSel]}>
                            {l.formula_name}
                          </Text>
                          <Text style={[styles.formulaChipQty, sel && styles.formulaChipTextSel]}>
                            {l.remaining} disp
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.currentRow}>
                    <Text style={styles.currentLabel}>Estoque atual na bombona:</Text>
                    <Text style={styles.currentValue}>
                      {sacos(delivering.currentDbSacks + delivering.manualAdjust)}
                      {delivering.manualAdjust !== 0 && (
                        <Text style={styles.currentAdj}>
                          {' '}({delivering.manualAdjust > 0 ? '+' : ''}{delivering.manualAdjust})
                        </Text>
                      )}
                    </Text>
                  </View>

                  {!delivering.showManualAdjust && (
                    <TouchableOpacity
                      onPress={() => setDelivering({ ...delivering, showManualAdjust: true })}
                      style={styles.adjustToggle}
                    >
                      <Text style={styles.adjustToggleText}>Ajuste manual (divergência/perda)</Text>
                    </TouchableOpacity>
                  )}

                  {delivering.showManualAdjust && (
                    <View style={styles.adjustBox}>
                      <View style={styles.adjustWarnRow}>
                        <AlertTriangle size={14} color={NSA.dangerFg} strokeWidth={1.75} />
                        <Text style={styles.adjustWarn}>
                          Esse ajuste será registrado como <Text style={{ fontFamily: Fonts.semibold }}>perda</Text> ou recontagem no relatório de inventário.
                        </Text>
                      </View>
                      <Text style={styles.formLabel}>Diferença em sacos</Text>
                      <Text style={styles.formHint}>
                        Negativo = sumiu; Positivo = tem mais do que o app mostra
                      </Text>
                      <SliderInput
                        value={delivering.manualAdjust}
                        onValueChange={(v) => setDelivering({ ...delivering, manualAdjust: v })}
                        min={-Math.max(delivering.currentDbSacks, 5)}
                        max={10}
                        step={1}
                        unit="sacos"
                        color={NSA.danger}
                      />
                    </View>
                  )}

                  <View style={styles.sep} />

                  <Text style={styles.formLabel}>Sacos que vou deixar agora</Text>
                  <Text style={styles.formHint}>
                    {(() => {
                      const rem = loads.find((l) => l.formula_id === delivering.formulaId)?.remaining ?? 0;
                      return rem === 1 ? `Resta ${sacos(rem)} no trator` : `Restam ${sacos(rem)} no trator`;
                    })()}
                  </Text>
                  <SliderInput
                    value={delivering.toDeliver}
                    onValueChange={(v) => setDelivering({ ...delivering, toDeliver: v })}
                    min={0}
                    max={Math.min(
                      Math.max(loads.find((l) => l.formula_id === delivering.formulaId)?.remaining ?? 0, 1),
                      10,
                    )}
                    step={1}
                    unit="sacos"
                  />

                  <View style={styles.formTotal}>
                    <Text style={styles.formTotalLabel}>Total na bombona após:</Text>
                    <Text style={styles.formTotalValue}>
                      {sacos(delivering.currentDbSacks + delivering.manualAdjust + delivering.toDeliver)}
                    </Text>
                  </View>

                  <View style={styles.deliverActions}>
                    <Button title="Cancelar" variant="outline" onPress={() => setDelivering(null)} style={{ flex: 1 }} />
                    <Button title="Confirmar" onPress={handleConfirm} style={{ flex: 1 }} />
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.progressText}>
            {totalRemaining === 1
              ? `${sacos(totalRemaining)} resta no trator → volta à sede`
              : `${sacos(totalRemaining)} restam no trator → voltam à sede`}
          </Text>
        </Card>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyFooter}>
        <Button
          title={totalRemaining === 1
            ? `Encerrar rota · ${sacos(totalRemaining)} volta`
            : `Encerrar rota · ${sacos(totalRemaining)} voltam`}
          onPress={() => router.replace(`/reabastecimento/resumo?routeId=${routeId}`)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  tratorBar: {
    backgroundColor: NSA.green50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
  },
  tratorHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tratorLabel: { fontSize: 11, fontFamily: Fonts.medium, letterSpacing: 1.2, textTransform: 'uppercase', color: NSA.green800 },
  tratorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tratorName: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.medium },
  tratorQty: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.regular },
  tratorQtyBold: { fontFamily: Fonts.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NSA.bgElevated,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  listTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemDetail: { fontSize: 12, color: NSA.inkSecondary, marginTop: 2, fontFamily: Fonts.regular },
  itemDetailMuted: { fontSize: 12, color: NSA.inkMuted, marginTop: 2, fontStyle: 'italic', fontFamily: Fonts.regular },
  deliveredRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  deliveredText: { fontSize: 12, color: NSA.okFg, fontFamily: Fonts.medium },
  deliverForm: { marginTop: 12 },
  formLabel: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.inkSecondary, marginTop: 6 },
  formHint: { fontSize: 11, color: NSA.inkMuted, marginBottom: 4, fontFamily: Fonts.regular },
  formulaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  formulaChip: {
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: NSA.bgElevated,
  },
  formulaChipSel: { borderColor: NSA.green800, backgroundColor: NSA.green50 },
  formulaChipText: { fontSize: 12, color: NSA.inkPrimary, fontFamily: Fonts.medium },
  formulaChipQty: { fontSize: 10, color: NSA.inkMuted, marginTop: 2 },
  formulaChipTextSel: { color: NSA.green800 },
  sep: { height: 1, backgroundColor: NSA.borderSubtle, marginVertical: 12 },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  currentLabel: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.regular },
  currentValue: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary },
  currentAdj: { color: NSA.danger, fontFamily: Fonts.semibold, fontSize: 12 },
  adjustToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  adjustToggleText: {
    fontSize: 11,
    color: NSA.inkMuted,
    textDecorationLine: 'underline',
    fontFamily: Fonts.medium,
  },
  adjustBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: NSA.dangerBg,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: NSA.danger,
  },
  adjustWarnRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  adjustWarn: { fontSize: 11, color: NSA.inkPrimary, lineHeight: 15, fontFamily: Fonts.regular, flex: 1 },
  formTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: NSA.green50,
    padding: 10,
    borderRadius: Radius.lg,
    marginTop: 4,
  },
  formTotalLabel: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.medium },
  formTotalValue: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.green800 },
  deliverActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  progressText: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary, textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: NSA.inkPrimary,
    fontFamily: Fonts.regular,
  },
  searchClear: { padding: 4 },
  noMatch: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 8, fontFamily: Fonts.regular },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,227,0.4)',
  },
  cancelBtnText: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.8,
    color: NSA.cream,
    textTransform: 'uppercase',
  },
});
