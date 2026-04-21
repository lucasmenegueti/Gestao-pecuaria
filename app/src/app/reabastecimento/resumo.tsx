import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SummaryRow, KPI, BrandHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface LoadSummary {
  formula_id: number;
  formula_name: string;
  loaded: number;
  distributed: number;
  returned: number;
}

interface PaddockDelivery {
  paddock_name: string;
  formula_name: string;
  total: number;
}

export default function ResumoScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [byPaddock, setByPaddock] = useState<PaddockDelivery[]>([]);
  const [finishing, setFinishing] = useState(false);
  // Guard contra double-tap no "Confirmar e finalizar": state é async, não segura
  // taps rápidos. Sem isso, 2 cliques = 2x UPDATE no inventory = sacos duplicados.
  const finishingRef = useRef(false);

  useEffect(() => {
    loadSummary().catch((e) => {
      if (__DEV__) console.warn('[resumo] loadSummary falhou:', e?.message);
      Alert.alert('Erro', 'Falha ao carregar resumo da rota. Tente voltar e abrir de novo.');
    });
  }, []);

  async function loadSummary() {
    const rows = await db.getAllAsync<{
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
      rows.map((r) => ({
        formula_id: r.formula_id,
        formula_name: r.name,
        loaded: r.sacks_loaded,
        distributed: r.sacks_distributed,
        returned: r.sacks_loaded - r.sacks_distributed,
      }))
    );

    const count = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(DISTINCT paddock_id) as c FROM resupply_deliveries WHERE route_id=?',
      [Number(routeId)]
    );
    setDeliveredCount(count?.c || 0);

    const paddockRows = await db.getAllAsync<PaddockDelivery>(
      `SELECT p.name as paddock_name, f.name as formula_name, SUM(rd.sacks_delivered) as total
       FROM resupply_deliveries rd
       JOIN paddocks p ON p.id = rd.paddock_id
       JOIN formulas f ON f.id = rd.formula_id
       WHERE rd.route_id = ?
       GROUP BY rd.paddock_id, rd.formula_id
       ORDER BY p.name, f.name`,
      [Number(routeId)]
    );
    setByPaddock(paddockRows);
  }

  async function handleFinish() {
    if (finishingRef.current || finishing) return;
    finishingRef.current = true;
    setFinishing(true);
    try {
      // Transação: devolução ao central + eventos + fechamento da rota caem juntos.
      // Se qualquer passo falhar, nada se commita e a rota continua 'in_progress'.
      await db.withTransactionAsync(async () => {
        for (const load of loads) {
          if (load.returned > 0) {
            await db.runAsync(
              `UPDATE inventory SET quantity_sacks = quantity_sacks + ?
               WHERE formula_id = ? AND location='central'`,
              [load.returned, load.formula_id]
            );
            await db.runAsync(
              `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
               VALUES ('RETORNO_CENTRAL_ROTA', ?, NULL, ?, ?, ?)`,
              [load.formula_id, load.returned, `Retorno rota #${routeId}`, user?.id ?? null]
            );
          }
          await db.runAsync(
            `UPDATE resupply_loads SET sacks_returned=?
             WHERE route_id=? AND formula_id=?`,
            [load.returned, Number(routeId), load.formula_id]
          );
        }
        await db.runAsync(
          `UPDATE resupply_routes SET status='completed', end_time=datetime('now','localtime') WHERE id=?`,
          [Number(routeId)]
        );
      });
      router.replace('/(tabs)/estoque');
    } catch (err) {
      if (__DEV__) console.error('[resumo] falha', err);
      finishingRef.current = false;
      setFinishing(false);
      Alert.alert('Erro', String((err as Error)?.message ?? 'Falha ao finalizar.'));
    }
  }

  const totalLoaded = loads.reduce((s, l) => s + l.loaded, 0);
  const totalDistributed = loads.reduce((s, l) => s + l.distributed, 0);
  const totalReturned = loads.reduce((s, l) => s + l.returned, 0);

  return (
    <View style={styles.root}>
      <BrandHeader
        title="Volta à sede"
        context="Fase 3 · Reabastecimento"
        fallback={`/reabastecimento/rota?routeId=${routeId}`}
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KPI
              label="Abastecidas"
              value={deliveredCount}
              unit={deliveredCount === 1 ? 'bombona' : 'bombonas'}
              style={{ flex: 1 }}
            />
            <KPI
              label="Distribuídos"
              value={totalDistributed}
              unit={`/ ${totalLoaded}`}
              style={{ flex: 1 }}
            />
          </View>

          <Text style={styles.sectionTitle}>ENTREGAS POR PIQUETE</Text>
          <Card>
            {byPaddock.length === 0 ? (
              <Text style={styles.emptyRow}>Nenhuma entrega registrada nesta rota.</Text>
            ) : (
              (() => {
                const grouped = new Map<string, Array<{ formula: string; total: number }>>();
                byPaddock.forEach((d) => {
                  const arr = grouped.get(d.paddock_name) || [];
                  arr.push({ formula: d.formula_name, total: d.total });
                  grouped.set(d.paddock_name, arr);
                });
                return Array.from(grouped.entries()).map(([paddock, items]) => (
                  <View key={paddock} style={styles.paddockBlock}>
                    <Text style={styles.paddockName}>{paddock}</Text>
                    {items.map((it) => (
                      <View key={it.formula} style={styles.paddockRow}>
                        <Text style={styles.paddockFormula}>{it.formula}</Text>
                        <Text style={styles.paddockQty}>+{it.total} sacos</Text>
                      </View>
                    ))}
                  </View>
                ));
              })()
            )}
          </Card>

          <Text style={styles.sectionTitle}>DISTRIBUIÇÃO POR FÓRMULA</Text>
          {loads.map((l) => (
            <Card key={l.formula_id}>
              <Text style={styles.loadName}>{l.formula_name}</Text>
              <SummaryRow label="Levou do central" value={`${l.loaded} sacos`} />
              <SummaryRow label="Entregou" value={`${l.distributed} sacos`} valueColor={NSA.ok} />
              <SummaryRow
                label="Volta pra sede"
                value={`${l.returned} sacos`}
                valueColor={l.returned > 0 ? NSA.warnFg : NSA.inkMuted}
              />
            </Card>
          ))}

          <Card style={styles.returnBox} borderColor={NSA.warn}>
            <View style={styles.returnLabelRow}>
              <AlertTriangle size={14} color={NSA.warnFg} strokeWidth={1.75} />
              <Text style={styles.returnLabel}>CONFIRMAR DEVOLUÇÃO À SEDE</Text>
            </View>
            <Text style={styles.returnAmount}>{totalReturned} sacos</Text>
            <Text style={styles.returnHint}>
              Vão voltar ao estoque central. Verifique o trator antes de confirmar.
            </Text>
            {loads.filter((l) => l.returned > 0).map((l) => (
              <View key={l.formula_id} style={styles.returnRow}>
                <Text style={styles.returnRowName}>{l.formula_name}</Text>
                <Text style={styles.returnRowQty}>{l.returned} sacos</Text>
              </View>
            ))}
            {totalReturned === 0 && (
              <Text style={styles.returnEmpty}>Nada voltando — trator vazio.</Text>
            )}
          </Card>
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button
            title={finishing ? 'Finalizando…' : 'Confirmar e finalizar'}
            onPress={handleFinish}
            disabled={finishing}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginTop: 20,
    marginBottom: 10,
  },
  loadName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 8, letterSpacing: -0.15 },
  returnBox: { marginTop: 16, backgroundColor: NSA.warnBg },
  returnLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  returnLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.warnFg,
  },
  returnAmount: {
    fontSize: 32,
    fontFamily: Fonts.loraSemibold,
    color: NSA.warnFg,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  returnHint: { fontSize: 12, color: NSA.inkSecondary, textAlign: 'center', marginTop: 4, lineHeight: 17, fontFamily: Fonts.regular },
  returnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
    marginTop: 8,
  },
  returnRowName: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.medium },
  returnRowQty: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.semibold },
  returnEmpty: { fontSize: 12, color: NSA.inkMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic', fontFamily: Fonts.regular },
  emptyRow: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', paddingVertical: 12, fontFamily: Fonts.regular },
  paddockBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NSA.borderSubtle },
  paddockName: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginBottom: 4, letterSpacing: -0.15 },
  paddockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, paddingLeft: 8 },
  paddockFormula: { fontSize: 12, color: NSA.inkSecondary, fontFamily: Fonts.regular },
  paddockQty: { fontSize: 12, fontFamily: Fonts.semibold, color: NSA.ok },
});
