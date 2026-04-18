import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SummaryRow } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    loadSummary();
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
    if (finishing) return;
    setFinishing(true);
    try {
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
      router.replace('/(tabs)/estoque');
    } catch (err) {
      console.error('[resumo] falha', err);
      setFinishing(false);
      Alert.alert('Erro', String((err as Error)?.message ?? 'Falha ao finalizar.'));
    }
  }

  const totalLoaded = loads.reduce((s, l) => s + l.loaded, 0);
  const totalDistributed = loads.reduce((s, l) => s + l.distributed, 0);
  const totalReturned = loads.reduce((s, l) => s + l.returned, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FASE 3: VOLTA À SEDE</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={{ backgroundColor: Colors.primary }}>
          <Text style={styles.headline}>
            {deliveredCount} {deliveredCount === 1 ? 'bombona' : 'bombonas'} abastecida{deliveredCount === 1 ? '' : 's'}
          </Text>
          <Text style={styles.headlineSub}>
            {totalDistributed} de {totalLoaded} sacos distribuídos
          </Text>
        </Card>

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
                  <Text style={styles.paddockName}>{paddock.toUpperCase()}</Text>
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
            <Text style={styles.loadName}>{l.formula_name.toUpperCase()}</Text>
            <SummaryRow label="Levou do central" value={`${l.loaded} sacos`} />
            <SummaryRow label="Entregou" value={`${l.distributed} sacos`} valueColor={Colors.success} />
            <SummaryRow
              label="Volta pra sede"
              value={`${l.returned} sacos`}
              valueColor={l.returned > 0 ? Colors.warning : Colors.textMuted}
            />
          </Card>
        ))}

        <Card style={styles.returnBox}>
          <Text style={styles.returnLabel}>⚠️ CONFIRMAR DEVOLUÇÃO À SEDE</Text>
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

        <Button
          title={finishing ? 'FINALIZANDO...' : 'CONFIRMAR E FINALIZAR'}
          onPress={handleFinish}
          disabled={finishing}
          variant="success"
          size="large"
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#e67e22', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headline: { fontSize: 20, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  headlineSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#7a7a7a', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  loadName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c', marginBottom: 8 },
  returnBox: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#e67e22',
    backgroundColor: '#fff8f0',
  },
  returnLabel: { fontSize: 14, fontWeight: '800', color: '#e67e22', textAlign: 'center' },
  returnAmount: { fontSize: 36, fontWeight: '800', color: '#e67e22', textAlign: 'center', marginTop: 4 },
  returnHint: { fontSize: 13, color: '#7a7a7a', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  returnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0dcd5',
    marginTop: 8,
  },
  returnRowName: { fontSize: 14, color: '#2c2c2c', fontWeight: '600' },
  returnRowQty: { fontSize: 14, color: '#2c2c2c', fontWeight: '800' },
  returnEmpty: { fontSize: 13, color: '#7a7a7a', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  emptyRow: { fontSize: 14, color: '#7a7a7a', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  paddockBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0dcd5' },
  paddockName: { fontSize: 14, fontWeight: '800', color: '#2c2c2c', marginBottom: 4 },
  paddockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, paddingLeft: 8 },
  paddockFormula: { fontSize: 13, color: '#2c2c2c' },
  paddockQty: { fontSize: 13, fontWeight: '800', color: '#2d8a4e' },
});
