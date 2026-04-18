import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const loadRows = await db.getAllAsync<{
      formula_id: number;
      name: string;
      sacks_loaded: number;
      sacks_distributed: number;
    }>(
      `SELECT rl.formula_id, f.name, rl.sacks_loaded, rl.sacks_distributed
       FROM resupply_loads rl JOIN formulas f ON f.id=rl.formula_id
       WHERE rl.route_id=?`,
      [Number(routeId)]
    );
    setLoads(
      loadRows.map((r) => ({
        formula_id: r.formula_id,
        formula_name: r.name,
        loaded: r.sacks_loaded,
        distributed: r.sacks_distributed,
        remaining: r.sacks_loaded - r.sacks_distributed,
      }))
    );

    const paddockRows = await db.getAllAsync<{ id: number; name: string }>(
      `SELECT id, name FROM paddocks WHERE active=1 ORDER BY name`
    );

    const bombonaRows = await db.getAllAsync<{
      paddock_id: number;
      formula_id: number;
      formula_name: string;
      quantity_sacks: number;
    }>(
      `SELECT i.paddock_id, i.formula_id, f.name as formula_name, i.quantity_sacks
       FROM inventory i JOIN formulas f ON f.id=i.formula_id
       WHERE i.location='bombona'`
    );
    const bombMap = new Map<number, PaddockRow['bombonas']>();
    bombonaRows.forEach((b) => {
      const arr = bombMap.get(b.paddock_id) || [];
      arr.push({ formula_id: b.formula_id, formula_name: b.formula_name, db_sacks: b.quantity_sacks });
      bombMap.set(b.paddock_id, arr);
    });

    const delivRows = await db.getAllAsync<{ paddock_id: number; total: number }>(
      `SELECT paddock_id, SUM(sacks_delivered) as total FROM resupply_deliveries
       WHERE route_id=? GROUP BY paddock_id`,
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
    // default: primeira fórmula do trator com remaining > 0 ou primeira bombona existente
    const firstLoad = loads.find((l) => l.remaining > 0) ?? loads[0];
    const formulaId = firstLoad?.formula_id ?? p.bombonas[0]?.formula_id;
    if (!formulaId) {
      Alert.alert('Sem ração', 'Não há ração no trator.');
      return;
    }
    const existing = p.bombonas.find((b) => b.formula_id === formulaId);
    setDelivering({
      paddockId: p.paddock_id,
      paddockName: p.paddock_name,
      formulaId,
      currentDbSacks: existing?.db_sacks ?? 0,
      manualAdjust: 0,
      showManualAdjust: false,
      toDeliver: Math.min(firstLoad?.remaining ?? 0, 5),
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
      Alert.alert('Sem ração', `Só restam ${remaining} sacos desta fórmula no trator.`);
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
      console.error('[rota] falha', err);
      Alert.alert('Erro', String((err as Error)?.message ?? 'Falha na entrega'));
    }
  }

  const totalRemaining = loads.reduce((s, l) => s + l.remaining, 0);
  const abastecidos = paddocks.filter((p) => p.delivered_to_here > 0).length;
  const q = search.trim().toLowerCase();
  const filteredPaddocks = q
    ? paddocks.filter((p) => p.paddock_name.toLowerCase().includes(q))
    : paddocks;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FASE 2: ROTA EM ANDAMENTO</Text>
        <Text style={styles.headerSub}>Fechar o app não perde nada — tudo é salvo ao confirmar</Text>
      </View>

      <View style={styles.tratorBar}>
        <Text style={styles.tratorLabel}>🚜 NO TRATOR</Text>
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
          PIQUETES ({abastecidos}/{paddocks.length} abastecidos)
        </Text>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Buscar piquete..."
            placeholderTextColor="#9a9a9a"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear} hitSlop={10}>
              <Text style={styles.searchClearText}>✕</Text>
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
            <Card key={p.paddock_id} borderColor={delivered ? Colors.success : undefined}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.paddock_name.toUpperCase()}</Text>
                  {p.bombonas.length === 0 ? (
                    <Text style={styles.itemDetailMuted}>Sem bombona — será criada ao entregar</Text>
                  ) : (
                    p.bombonas.map((b) => (
                      <Text key={b.formula_id} style={styles.itemDetail}>
                        {b.formula_name}: {b.db_sacks} sacos
                      </Text>
                    ))
                  )}
                  {delivered && (
                    <Text style={styles.deliveredText}>✅ Abastecido nesta rota: +{p.delivered_to_here}</Text>
                  )}
                </View>
              </View>

              {!isOpen && (
                <Button
                  title={delivered ? 'ABASTECER MAIS / AJUSTAR' : 'ABASTECER / AJUSTAR'}
                  variant={delivered ? 'secondary' : 'warning'}
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
                      {delivering.currentDbSacks + delivering.manualAdjust} sacos
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
                      <Text style={styles.adjustWarn}>
                        ⚠️ Esse ajuste será registrado como <Text style={{ fontWeight: '800' }}>perda</Text> ou
                        recontagem no relatório de inventário.
                      </Text>
                      <Text style={styles.formLabel}>Diferença em sacos</Text>
                      <Text style={styles.formHint}>
                        Negativo = sumiu; Positivo = tem mais do que o app mostra
                      </Text>
                      <SliderInput
                        value={delivering.manualAdjust}
                        onValueChange={(v) => setDelivering({ ...delivering, manualAdjust: v })}
                        min={-Math.max(delivering.currentDbSacks, 5)}
                        max={10}
                        step={0.5}
                        unit="sacos"
                        color={Colors.danger}
                      />
                    </View>
                  )}

                  <View style={styles.sep} />

                  <Text style={styles.formLabel}>Sacos que vou deixar agora</Text>
                  <Text style={styles.formHint}>
                    Restam {loads.find((l) => l.formula_id === delivering.formulaId)?.remaining ?? 0} sacos no trator
                  </Text>
                  <SliderInput
                    value={delivering.toDeliver}
                    onValueChange={(v) => setDelivering({ ...delivering, toDeliver: v })}
                    min={0}
                    max={Math.min(
                      Math.max(loads.find((l) => l.formula_id === delivering.formulaId)?.remaining ?? 0, 1),
                      10,
                    )}
                    step={0.5}
                    unit="sacos"
                    color={Colors.warning}
                  />

                  <View style={styles.formTotal}>
                    <Text style={styles.formTotalLabel}>Total na bombona após:</Text>
                    <Text style={styles.formTotalValue}>
                      {delivering.currentDbSacks + delivering.manualAdjust + delivering.toDeliver} sacos
                    </Text>
                  </View>

                  <View style={styles.deliverActions}>
                    <Button
                      title="CANCELAR"
                      variant="outline"
                      onPress={() => setDelivering(null)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="CONFIRMAR"
                      variant="warning"
                      onPress={handleConfirm}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.progressText}>
            {totalRemaining} sacos restam no trator → voltam à sede
          </Text>
        </Card>
      </ScrollView>

      {/* Sticky footer — sempre visível mesmo com 125 piquetes na lista */}
      <View style={styles.stickyFooter}>
        <Button
          title={`ENCERRAR ROTA · ${totalRemaining} sacos voltam`}
          variant="danger"
          onPress={() => router.replace(`/reabastecimento/resumo?routeId=${routeId}`)}
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#e67e22', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontStyle: 'italic' },
  tratorBar: { backgroundColor: '#fff3e0', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0dcd5' },
  tratorLabel: { fontSize: 13, fontWeight: '800', color: '#e67e22', marginBottom: 6 },
  tratorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tratorName: { fontSize: 14, color: '#2c2c2c', fontWeight: '600' },
  tratorQty: { fontSize: 14, color: '#2c2c2c' },
  tratorQtyBold: { fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0dcd5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  listTitle: { fontSize: 13, fontWeight: '800', color: '#7a7a7a', letterSpacing: 0.5, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  itemDetail: { fontSize: 13, color: '#2c2c2c', marginTop: 2 },
  itemDetailMuted: { fontSize: 13, color: '#7a7a7a', marginTop: 2, fontStyle: 'italic' },
  deliveredText: { fontSize: 13, color: '#2d8a4e', fontWeight: '700', marginTop: 4 },
  deliverForm: { marginTop: 12 },
  formLabel: { fontSize: 14, fontWeight: '800', color: '#2c2c2c', marginTop: 4 },
  formHint: { fontSize: 12, color: '#7a7a7a', marginBottom: 4, fontStyle: 'italic' },
  formulaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  formulaChip: {
    borderWidth: 2,
    borderColor: '#e0dcd5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  formulaChipSel: { borderColor: '#e67e22', backgroundColor: '#fff3e0' },
  formulaChipText: { fontSize: 13, color: '#2c2c2c', fontWeight: '700' },
  formulaChipQty: { fontSize: 11, color: '#7a7a7a', marginTop: 2 },
  formulaChipTextSel: { color: '#e67e22' },
  sep: { height: 1, backgroundColor: '#e0dcd5', marginVertical: 12 },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  currentLabel: { fontSize: 14, color: '#2c2c2c', fontWeight: '600' },
  currentValue: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  currentAdj: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
  adjustToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  adjustToggleText: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  adjustBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  adjustWarn: { fontSize: 11, color: '#2c2c2c', marginBottom: 8, lineHeight: 15 },
  formTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  formTotalLabel: { fontSize: 14, color: '#2c2c2c', fontWeight: '600' },
  formTotalValue: { fontSize: 16, fontWeight: '800', color: '#e67e22' },
  deliverActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  progressText: { fontSize: 15, fontWeight: '700', color: '#2c2c2c', textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0dcd5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c2c2c',
  },
  searchClear: { padding: 4 },
  searchClearText: { fontSize: 18, color: '#7a7a7a', fontWeight: '700' },
  noMatch: { fontSize: 14, color: '#7a7a7a', textAlign: 'center', fontStyle: 'italic', marginTop: 8 },
});
