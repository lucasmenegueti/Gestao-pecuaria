import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

interface BombonaRow {
  paddock_id: number;
  paddock_name: string;
  formula_name: string;
  formula_id: number;
  current_sacks: number;
  delivered: boolean;
  delivered_amount: number;
}

interface LoadInfo {
  formula_id: number;
  formula_name: string;
  loaded: number;
  distributed: number;
  remaining: number;
}

export default function RotaScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const db = useDatabase();
  const [bombonas, setBombonas] = useState<BombonaRow[]>([]);
  const [loads, setLoads] = useState<LoadInfo[]>([]);
  const [delivering, setDelivering] = useState<{ paddockId: number; formulaId: number; amount: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    // Load route loads
    const loadRows = await db.getAllAsync<{ formula_id: number; name: string; sacks_loaded: number; sacks_distributed: number }>(
      `SELECT rl.formula_id, f.name, rl.sacks_loaded, rl.sacks_distributed
       FROM resupply_loads rl JOIN formulas f ON f.id=rl.formula_id
       WHERE rl.route_id=?`,
      [Number(routeId)]
    );
    setLoads(loadRows.map((r) => ({
      formula_id: r.formula_id,
      formula_name: r.name,
      loaded: r.sacks_loaded,
      distributed: r.sacks_distributed,
      remaining: r.sacks_loaded - r.sacks_distributed,
    })));

    // Load bombonas
    const bombonaRows = await db.getAllAsync<{
      paddock_id: number;
      paddock_name: string;
      formula_name: string;
      formula_id: number;
      quantity_sacks: number;
    }>(
      `SELECT i.paddock_id, p.name as paddock_name, f.name as formula_name, i.formula_id, i.quantity_sacks
       FROM inventory i
       JOIN paddocks p ON p.id=i.paddock_id
       JOIN formulas f ON f.id=i.formula_id
       WHERE i.location='bombona'
       ORDER BY i.quantity_sacks ASC`
    );

    // Check which ones have been delivered
    const deliveries = await db.getAllAsync<{ paddock_id: number; sacks_delivered: number }>(
      'SELECT paddock_id, SUM(sacks_delivered) as sacks_delivered FROM resupply_deliveries WHERE route_id=? GROUP BY paddock_id',
      [Number(routeId)]
    );
    const deliveryMap = new Map(deliveries.map((d) => [d.paddock_id, d.sacks_delivered]));

    setBombonas(bombonaRows.map((b) => ({
      ...b,
      current_sacks: b.quantity_sacks,
      delivered: deliveryMap.has(b.paddock_id),
      delivered_amount: deliveryMap.get(b.paddock_id) || 0,
    })));
  }

  async function handleDeliver() {
    if (!delivering) return;
    try {
      await db.runAsync(
        "INSERT INTO resupply_deliveries (route_id, paddock_id, formula_id, sacks_delivered) VALUES (?,?,?,?)",
        [Number(routeId), delivering.paddockId, delivering.formulaId, delivering.amount]
      );
      await db.runAsync(
        'UPDATE resupply_loads SET sacks_distributed = sacks_distributed + ? WHERE route_id=? AND formula_id=?',
        [delivering.amount, Number(routeId), delivering.formulaId]
      );
      await db.runAsync(
        "UPDATE inventory SET quantity_sacks = quantity_sacks + ?, last_resupply_date = date('now') WHERE paddock_id=? AND location='bombona' AND formula_id=?",
        [delivering.amount, delivering.paddockId, delivering.formulaId]
      );
      setDelivering(null);
      loadData();
    } catch (err) {
      Alert.alert('Erro', 'Falha na entrega');
    }
  }

  const delivered = bombonas.filter((b) => b.delivered).length;
  const total = bombonas.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ROTA EM ANDAMENTO</Text>
      </View>

      {/* Trator bar */}
      <View style={styles.tratorBar}>
        <Text style={styles.tratorLabel}>NO TRATOR:</Text>
        {loads.map((l, i) => (
          <Text key={i} style={styles.tratorItem}>{l.formula_name}: {l.remaining} restam (de {l.loaded})</Text>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {bombonas.map((b, idx) => (
          <Card key={idx} borderColor={b.delivered ? Colors.success : b.current_sacks === 0 ? Colors.danger : Colors.warning}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{b.paddock_name.toUpperCase()}</Text>
                <Text style={styles.itemDetail}>{b.formula_name}: {b.current_sacks} sacos</Text>
              </View>
              {b.delivered ? (
                <Badge label={`✅ +${b.delivered_amount}`} variant="ok" />
              ) : delivering?.paddockId === b.paddock_id ? null : (
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() => {
                    const load = loads.find((l) => l.formula_id === b.formula_id);
                    setDelivering({ paddockId: b.paddock_id, formulaId: b.formula_id, amount: Math.min(load?.remaining || 5, 5) });
                  }}
                >
                  <Text style={styles.deliverText}>ABASTECER</Text>
                </TouchableOpacity>
              )}
            </View>
            {delivering?.paddockId === b.paddock_id && (
              <View style={styles.deliverForm}>
                <SliderInput
                  value={delivering.amount}
                  onValueChange={(v) => setDelivering({ ...delivering, amount: v })}
                  min={1}
                  max={loads.find((l) => l.formula_id === delivering.formulaId)?.remaining || 1}
                  step={1}
                  unit="sacos"
                  color={Colors.warning}
                />
                <View style={styles.deliverActions}>
                  <Button title="CANCELAR" variant="outline" onPress={() => setDelivering(null)} style={{ flex: 1 }} />
                  <Button title="CONFIRMAR" variant="warning" onPress={handleDeliver} style={{ flex: 1 }} />
                </View>
              </View>
            )}
          </Card>
        ))}

        <Card>
          <Text style={styles.progressText}>{delivered} de {total} piquetes</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: total > 0 ? `${(delivered / total) * 100}%` : '0%' }]} />
          </View>
        </Card>

        <Button
          title="ENCERRAR ROTA"
          variant="danger"
          onPress={() => router.replace(`/reabastecimento/resumo?routeId=${routeId}`)}
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  tratorBar: { backgroundColor: '#fff3e0', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0dcd5' },
  tratorLabel: { fontSize: 14, fontWeight: '800', color: '#e67e22' },
  tratorItem: { fontSize: 13, color: '#2c2c2c', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  itemDetail: { fontSize: 14, color: '#7a7a7a', marginTop: 2 },
  deliverBtn: { backgroundColor: '#e67e22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deliverText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  deliverForm: { marginTop: 12 },
  deliverActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  progressText: { fontSize: 16, fontWeight: '700', color: '#2c2c2c', marginBottom: 8 },
  bar: { height: 8, backgroundColor: '#e0dcd5', borderRadius: 4 },
  barFill: { height: '100%', backgroundColor: '#e67e22', borderRadius: 4 },
});
