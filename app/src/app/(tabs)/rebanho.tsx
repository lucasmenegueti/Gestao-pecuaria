import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, CardTitle, Button, Badge } from '@/components/ui';
import { Colors, calculateStockingRate } from '@/constants';

interface PaddockHerd {
  paddock_id: number;
  paddock_name: string;
  area: number;
  categories: Array<{ category: string; head_count: number; avg_weight: number | null }>;
  total: number;
}

export default function RebanhoScreen() {
  const db = useDatabase();
  const [herds, setHerds] = useState<PaddockHerd[]>([]);
  const [totalHeads, setTotalHeads] = useState(0);
  const [totalArea, setTotalArea] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadHerd();
    }, [])
  );

  async function loadHerd() {
    const rows = await db.getAllAsync<{
      paddock_id: number;
      paddock_name: string;
      area: number;
      category: string;
      head_count: number;
      avg_weight_kg: number | null;
    }>(`
      SELECT p.id as paddock_id, p.name as paddock_name, p.area_hectares as area,
        h.category, h.head_count, h.avg_weight_kg
      FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      ORDER BY p.name, h.category
    `);

    const map = new Map<number, PaddockHerd>();
    let heads = 0;
    const areaResult = await db.getFirstAsync<{ total: number }>('SELECT SUM(area_hectares) as total FROM paddocks WHERE active = 1');

    rows.forEach((r) => {
      if (!map.has(r.paddock_id)) {
        map.set(r.paddock_id, {
          paddock_id: r.paddock_id,
          paddock_name: r.paddock_name,
          area: r.area,
          categories: [],
          total: 0,
        });
      }
      const entry = map.get(r.paddock_id)!;
      entry.categories.push({ category: r.category, head_count: r.head_count, avg_weight: r.avg_weight_kg });
      entry.total += r.head_count;
      heads += r.head_count;
    });

    setHerds(Array.from(map.values()));
    setTotalHeads(heads);
    setTotalArea(areaResult?.total || 0);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rebanho</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <Card style={{ backgroundColor: Colors.primary }}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalHeads}</Text>
              <Text style={styles.summaryLabel}>cabeças</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateStockingRate(totalHeads, totalArea)}</Text>
              <Text style={styles.summaryLabel}>cab/ha</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>POR PIQUETE</Text>

        {herds.map((h) => (
          <Card key={h.paddock_id}>
            <View style={styles.paddockHeader}>
              <Text style={styles.paddockName}>{h.paddock_name.toUpperCase()}</Text>
              <Text style={styles.paddockInfo}>{h.area} ha • {h.total} cab</Text>
            </View>
            {h.categories.map((c, i) => (
              <View key={i} style={styles.catRow}>
                <Text style={styles.catName}>{c.category}</Text>
                <Text style={styles.catCount}>{c.head_count} cab</Text>
                {c.avg_weight && <Text style={styles.catWeight}>{c.avg_weight} kg</Text>}
              </View>
            ))}
          </Card>
        ))}

        <View style={styles.actionRow}>
          <Button
            title="MOVER REBANHO"
            onPress={() => router.push('/admin/mover-rebanho')}
            style={styles.actionBtn}
          />
          <Button
            title="EVENTO"
            variant="secondary"
            onPress={() => router.push('/admin/evento')}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 32, fontWeight: '800', color: Colors.white },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textMuted, marginTop: 20, marginBottom: 8 },
  paddockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paddockName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  paddockInfo: { fontSize: 14, color: Colors.textMuted },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  catName: { flex: 1, fontSize: 14, color: Colors.text },
  catCount: { fontSize: 14, fontWeight: '700', color: Colors.text, width: 60 },
  catWeight: { fontSize: 14, color: Colors.textMuted, width: 60, textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1 },
});
