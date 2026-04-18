import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Badge } from '@/components/ui';
import { Colors, calculateStockingRate } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PaddockLot {
  id: number;
  name: string;
  area: number;
  total_heads: number;
  categories: string;
}

export default function LotacaoScreen() {
  const db = useDatabase();
  const [paddocks, setPaddocks] = useState<PaddockLot[]>([]);
  const [totalHeads, setTotalHeads] = useState(0);
  const [totalArea, setTotalArea] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      area_hectares: number;
      total_heads: number;
      categories: string;
    }>(`
      SELECT p.id, p.name, p.area_hectares,
        COALESCE(SUM(h.head_count), 0) as total_heads,
        GROUP_CONCAT(h.category || ' (' || h.head_count || ')', ' • ') as categories
      FROM paddocks p
      LEFT JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.name
    `);
    setPaddocks(rows.map(r => ({ id: r.id, name: r.name, area: r.area_hectares, total_heads: r.total_heads, categories: r.categories || '' })));
    setTotalHeads(rows.reduce((s, r) => s + r.total_heads, 0));
    const areaRow = await db.getFirstAsync<{ t: number }>('SELECT SUM(area_hectares) as t FROM paddocks WHERE active=1');
    setTotalArea(areaRow?.t || 0);
  }

  function getVariant(rate: number): 'ok' | 'warning' | 'danger' {
    if (rate > 1.8) return 'danger';
    if (rate > 1.5) return 'warning';
    return 'ok';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lotação</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={{ backgroundColor: Colors.primary }}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalHeads}</Text>
              <Text style={styles.summaryLabel}>cabeças</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalArea.toLocaleString('pt-BR')}</Text>
              <Text style={styles.summaryLabel}>hectares</Text>
            </View>
          </View>
          <Text style={styles.generalRate}>{calculateStockingRate(totalHeads, totalArea)} cab/ha</Text>
          <Text style={styles.generalLabel}>Lotação geral</Text>
        </Card>

        <Text style={styles.sectionTitle}>LOTAÇÃO POR PIQUETE</Text>

        {paddocks.map((p) => {
          const rate = calculateStockingRate(p.total_heads, p.area);
          const variant = getVariant(rate);
          return (
            <Card key={p.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.name.toUpperCase()}</Text>
                  <Text style={styles.itemDetail}>{p.total_heads} cab • {p.area} ha</Text>
                  {p.categories ? <Text style={styles.cats}>{p.categories}</Text> : null}
                </View>
                <View style={styles.rateBox}>
                  <Badge label={`${rate} cab/ha`} variant={variant} />
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#1a6b54', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  generalRate: { fontSize: 36, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginTop: 8 },
  generalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#7a7a7a', marginTop: 20, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  itemDetail: { fontSize: 14, color: '#7a7a7a', marginTop: 2 },
  cats: { fontSize: 12, color: '#7a7a7a', marginTop: 4 },
  rateBox: { marginLeft: 12 },
});
