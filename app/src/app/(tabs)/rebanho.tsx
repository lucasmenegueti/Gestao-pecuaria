import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge } from '@/components/ui';
import { Colors, CATTLE_CATEGORIES, calculateStockingRate, PAIR_CATEGORIES } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CategoryTotal {
  category: string;
  total: number;
}

interface PaddockHerd {
  paddock_id: number;
  paddock_name: string;
  area: number;
  categories: Array<{ category: string; head_count: number }>;
  total: number;
}


function isPairLot(cats: Array<{ category: string }>): boolean {
  if (cats.length < 2) return false;
  return cats.every((c) => PAIR_CATEGORIES.has(c.category));
}

export default function RebanhoScreen() {
  const db = useDatabase();
  const [totalsByCategory, setTotalsByCategory] = useState<CategoryTotal[]>([]);
  const [pool, setPool] = useState<CategoryTotal[]>([]);
  const [herds, setHerds] = useState<PaddockHerd[]>([]);
  const [totalHeads, setTotalHeads] = useState(0);
  const [totalArea, setTotalArea] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    // Totais farm-wide por categoria (inclui pool)
    const totalsRows = await db.getAllAsync<{ category: string; total: number }>(
      'SELECT category, SUM(head_count) AS total FROM herd GROUP BY category'
    );
    const totalsMap = new Map(totalsRows.map((r) => [r.category, r.total]));
    const ordered = CATTLE_CATEGORIES.map((c) => ({
      category: c.value,
      total: totalsMap.get(c.value) || 0,
    }));
    setTotalsByCategory(ordered);

    // Pool desalocada
    const poolRows = await db.getAllAsync<{ category: string; total: number }>(
      'SELECT category, SUM(head_count) AS total FROM herd WHERE paddock_id IS NULL GROUP BY category'
    );
    setPool(poolRows);

    // Por piquete
    const paddockRows = await db.getAllAsync<{
      paddock_id: number;
      paddock_name: string;
      area: number;
      category: string;
      head_count: number;
    }>(`
      SELECT p.id as paddock_id, p.name as paddock_name, p.area_hectares as area,
        h.category, h.head_count
      FROM paddocks p
      LEFT JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      ORDER BY p.name, h.category
    `);

    const map = new Map<number, PaddockHerd>();
    paddockRows.forEach((r) => {
      if (!map.has(r.paddock_id)) {
        map.set(r.paddock_id, {
          paddock_id: r.paddock_id,
          paddock_name: r.paddock_name,
          area: r.area,
          categories: [],
          total: 0,
        });
      }
      if (r.category != null) {
        const entry = map.get(r.paddock_id)!;
        entry.categories.push({ category: r.category, head_count: r.head_count });
        entry.total += r.head_count;
      }
    });
    setHerds(Array.from(map.values()));

    const total = ordered.reduce((s, r) => s + r.total, 0);
    setTotalHeads(total);
    const areaResult = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(area_hectares) as total FROM paddocks WHERE active = 1'
    );
    setTotalArea(areaResult?.total || 0);
  }

  const poolTotal = pool.reduce((s, r) => s + r.total, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rebanho</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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

        <Text style={styles.sectionTitle}>TOTAIS POR CATEGORIA</Text>
        <Card>
          {totalsByCategory.map((c) => (
            <View key={c.category} style={styles.totalRow}>
              <Text style={[styles.totalCat, c.total === 0 && styles.muted]}>{c.category}</Text>
              <Text style={[styles.totalCount, c.total === 0 && styles.muted]}>
                {c.total === 0 ? '—' : `${c.total} cab`}
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, styles.totalSum]}>
            <Text style={styles.totalSumLabel}>TOTAL</Text>
            <Text style={styles.totalSumCount}>{totalHeads} cab</Text>
          </View>
        </Card>

        {poolTotal > 0 && (
          <>
            <Text style={styles.sectionTitle}>DESALOCADOS (sem piquete)</Text>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: Colors.warning }}>
              {pool.map((c) => (
                <View key={c.category} style={styles.totalRow}>
                  <Text style={styles.totalCat}>{c.category}</Text>
                  <Text style={styles.totalCount}>{c.total} cab</Text>
                </View>
              ))}
              <Button
                title="ALOCAR EM PIQUETE"
                onPress={() => router.push('/admin/alocar')}
                style={{ marginTop: 12 }}
              />
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>POR PIQUETE</Text>
        {herds.map((h) => {
          const pair = isPairLot(h.categories);
          return (
            <Card key={h.paddock_id}>
              <View style={styles.paddockHeader}>
                <Text style={styles.paddockName}>{h.paddock_name.toUpperCase()}</Text>
                <Text style={styles.paddockInfo}>{h.area} ha • {h.total} cab</Text>
              </View>
              {pair && <Badge label="LOTE DE PARES (vaca + bezerro)" variant="ok" />}
              {h.categories.length === 0 ? (
                <Text style={styles.emptyCat}>Piquete vazio</Text>
              ) : (
                h.categories.map((c, i) => (
                  <View key={i} style={styles.catRow}>
                    <Text style={styles.catName}>{c.category}</Text>
                    <Text style={styles.catCount}>{c.head_count} cab</Text>
                  </View>
                ))
              )}
              {h.categories.length > 0 && (
                <Button
                  title="DESALOCAR"
                  variant="outline"
                  onPress={() => router.push(`/admin/desalocar?paddockId=${h.paddock_id}`)}
                  style={{ marginTop: 8 }}
                />
              )}
            </Card>
          );
        })}

        <View style={styles.actionGrid}>
          <Button
            title="MOVER REBANHO"
            onPress={() => router.push('/admin/mover-rebanho')}
            style={styles.actionBtn}
          />
          <Button
            title="DESALOCAR"
            variant="secondary"
            onPress={() => router.push('/admin/desalocar')}
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionGrid}>
          <Button
            title="ALOCAR"
            variant="secondary"
            onPress={() => router.push('/admin/alocar')}
            disabled={poolTotal === 0}
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
  scrollContent: { padding: 16, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 32, fontWeight: '800', color: Colors.white },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textMuted, marginTop: 20, marginBottom: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalCat: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  totalCount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  muted: { color: Colors.textMuted, fontWeight: '400' },
  totalSum: { borderBottomWidth: 0, paddingTop: 12, marginTop: 4, borderTopWidth: 2, borderTopColor: Colors.primary },
  totalSumLabel: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  totalSumCount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  paddockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paddockName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  paddockInfo: { fontSize: 14, color: Colors.textMuted },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  catName: { fontSize: 14, color: Colors.text },
  catCount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  emptyCat: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  actionGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1 },
});
