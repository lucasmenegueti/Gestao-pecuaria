import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SummaryRow } from '@/components/ui';
import { Colors } from '@/constants';

interface LoadSummary {
  formula_name: string;
  loaded: number;
  distributed: number;
  returned: number;
}

export default function ResumoScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const db = useDatabase();
  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [deliveredCount, setDeliveredCount] = useState(0);

  useEffect(() => { loadSummary(); }, []);

  async function loadSummary() {
    const rows = await db.getAllAsync<{ name: string; sacks_loaded: number; sacks_distributed: number }>(
      `SELECT f.name, rl.sacks_loaded, rl.sacks_distributed
       FROM resupply_loads rl JOIN formulas f ON f.id=rl.formula_id
       WHERE rl.route_id=?`,
      [Number(routeId)]
    );
    setLoads(rows.map((r) => ({
      formula_name: r.name,
      loaded: r.sacks_loaded,
      distributed: r.sacks_distributed,
      returned: r.sacks_loaded - r.sacks_distributed,
    })));

    const count = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(DISTINCT paddock_id) as c FROM resupply_deliveries WHERE route_id=?',
      [Number(routeId)]
    );
    setDeliveredCount(count?.c || 0);
  }

  async function handleFinish() {
    try {
      // Return leftover to central
      for (const load of loads) {
        if (load.returned > 0) {
          await db.runAsync(
            "UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE formula_id = (SELECT id FROM formulas WHERE name=?) AND location='central'",
            [load.returned, load.formula_name]
          );
        }
      }
      // Update route
      await db.runAsync(
        "UPDATE resupply_routes SET status='completed', end_time=datetime('now') WHERE id=?",
        [Number(routeId)]
      );
      for (const load of loads) {
        await db.runAsync(
          'UPDATE resupply_loads SET sacks_returned=? WHERE route_id=? AND formula_id=(SELECT id FROM formulas WHERE name=?)',
          [load.returned, Number(routeId), load.formula_name]
        );
      }
      router.replace('/(tabs)/estoque');
    } catch (err) {
      Alert.alert('Erro', 'Falha ao finalizar');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RESUMO DA ROTA</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={{ backgroundColor: Colors.suplementacao }}>
          <Text style={styles.summaryText}>{deliveredCount} piquetes abastecidos</Text>
        </Card>

        <Text style={styles.sectionTitle}>DISTRIBUIÇÃO</Text>
        {loads.map((l, i) => (
          <Card key={i}>
            <Text style={styles.loadName}>{l.formula_name.toUpperCase()}</Text>
            <SummaryRow label="Levou do central" value={`${l.loaded} sacos`} />
            <SummaryRow label="Distribuiu" value={`${l.distributed} sacos`} valueColor={Colors.success} />
            <SummaryRow label="Sobrou no trator" value={`${l.returned} sacos`} valueColor={Colors.warning} />
          </Card>
        ))}

        <Button title="FINALIZAR ROTA" onPress={handleFinish} variant="success" size="large" style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#e67e22', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryText: { fontSize: 20, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#7a7a7a', marginTop: 20, marginBottom: 8 },
  loadName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c', marginBottom: 8 },
});
