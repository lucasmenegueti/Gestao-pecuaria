import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, StatusPill, KPI, BrandHeader } from '@/components/ui';
import { calculateStockingRate } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

interface PaddockLot {
  id: number;
  name: string;
  area: number;
  total_heads: number;
  categories: string;
}

type StatusKind = 'ok' | 'warn' | 'danger';

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
        GROUP_CONCAT(h.category || ' (' || h.head_count || ')', ' · ') as categories
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

  function getKind(rate: number): StatusKind {
    if (rate > 1.8) return 'danger';
    if (rate > 1.5) return 'warn';
    return 'ok';
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Lotação" context="Rebanho" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KPI label="Cabeças" value={totalHeads} unit="total" style={{ flex: 1 }} />
            <KPI label="Hectares" value={totalArea.toLocaleString('pt-BR')} unit="ha" style={{ flex: 1 }} />
          </View>
          <View style={{ marginTop: 12 }}>
            <KPI label="Lotação geral" value={`${calculateStockingRate(totalHeads, totalArea)}`} unit="cab/ha" />
          </View>

          <Text style={styles.sectionTitle}>LOTAÇÃO POR PIQUETE</Text>

          {paddocks.map((p) => {
            const rate = calculateStockingRate(p.total_heads, p.area);
            const kind = getKind(rate);
            return (
              <Card key={p.id}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemDetail}>{p.total_heads} cab · {p.area} ha</Text>
                    {p.categories ? <Text style={styles.cats}>{p.categories}</Text> : null}
                  </View>
                  <View style={styles.rateBox}>
                    <StatusPill kind={kind}>{`${rate} cab/ha`}</StatusPill>
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginTop: 22,
    marginBottom: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemDetail: { fontSize: 12, color: NSA.inkSecondary, marginTop: 2, fontFamily: Fonts.regular },
  cats: { fontSize: 11, color: NSA.inkMuted, marginTop: 4, fontFamily: Fonts.regular },
  rateBox: { marginLeft: 12 },
});
