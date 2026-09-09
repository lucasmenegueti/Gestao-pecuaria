import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge, KPI, BrandHeader } from '@/components/ui';
import { NSA, Fonts } from '@/theme/nsa';
import { CATTLE_CATEGORIES, calculateStockingRate, PAIR_CATEGORIES } from '@/constants';
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    // deleted_at IS NULL + SUM + HAVING > 0 em todas as queries: rows soft-deleted
    // (deixadas com head_count=0 pra preservar supabase_id) não contaminam contagens
    // nem reaparecem como categorias zeradas.
    const totalsRows = await db.getAllAsync<{ category: string; total: number }>(
      `SELECT category, SUM(head_count) AS total FROM herd
       WHERE deleted_at IS NULL
       GROUP BY category
       HAVING SUM(head_count) > 0`
    );
    const totalsMap = new Map(totalsRows.map((r) => [r.category, r.total]));
    const ordered = CATTLE_CATEGORIES.map((c) => ({
      category: c.value,
      total: totalsMap.get(c.value) || 0,
    }));
    setTotalsByCategory(ordered);

    const poolRows = await db.getAllAsync<{ category: string; total: number }>(
      `SELECT category, SUM(head_count) AS total FROM herd
       WHERE paddock_id IS NULL AND deleted_at IS NULL
       GROUP BY category
       HAVING SUM(head_count) > 0`
    );
    setPool(poolRows);

    // INNER JOIN + HAVING SUM > 0 exclui piquetes vazios e lotes zerados.
    // Agrega por (paddock, category) — se por qualquer motivo houver rows duplicados
    // para a mesma categoria no mesmo piquete, somam. Piquete sem gado vivo
    // simplesmente não aparece em "POR PIQUETE".
    const paddockRows = await db.getAllAsync<{
      paddock_id: number;
      paddock_name: string;
      area: number;
      category: string;
      head_count: number;
    }>(`
      SELECT p.id as paddock_id, p.name as paddock_name, p.area_hectares as area,
        h.category, SUM(h.head_count) AS head_count
      FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.deleted_at IS NULL
      GROUP BY p.id, h.category
      HAVING SUM(h.head_count) > 0
      ORDER BY p.name, h.category
    `);

    const map = new Map<number, PaddockHerd>();
    paddockRows.forEach((r) => {
      if (r.head_count <= 0) return;
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
      entry.categories.push({ category: r.category, head_count: r.head_count });
      entry.total += r.head_count;
    });
    setHerds(Array.from(map.values()).filter((h) => h.total > 0));

    const total = ordered.reduce((s, r) => s + r.total, 0);
    setTotalHeads(total);
    const areaResult = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(area_hectares) as total FROM paddocks WHERE active = 1'
    );
    setTotalArea(areaResult?.total || 0);
  }

  const poolTotal = pool.reduce((s, r) => s + r.total, 0);

  return (
    <View style={styles.root}>
      <BrandHeader title="Rebanho" context={`${totalHeads} cab · ${calculateStockingRate(totalHeads, totalArea)} cab/ha`} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KPI label="Cabeças" value={totalHeads} unit="total" style={{ flex: 1 }} />
            <KPI label="Lotação" value={calculateStockingRate(totalHeads, totalArea)} unit="cab/ha" style={{ flex: 1 }} />
          </View>

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

          <Button
            title="Comprar gado"
            onPress={() => router.push('/admin/compra')}
            style={{ marginTop: 12 }}
          />

          {poolTotal > 0 && (
            <>
              <Text style={styles.sectionTitle}>DESALOCADOS (sem piquete)</Text>
              <Card borderColor={NSA.warn}>
                {pool.map((c) => (
                  <View key={c.category} style={styles.totalRow}>
                    <Text style={styles.totalCat}>{c.category}</Text>
                    <Text style={styles.totalCount}>{c.total} cab</Text>
                  </View>
                ))}
                <View style={styles.actionGrid}>
                  <Button title="Alocar" onPress={() => router.push('/admin/alocar')} style={styles.actionBtn} />
                  <Button title="Vender" variant="warning" onPress={() => router.push('/admin/venda')} style={styles.actionBtn} />
                </View>
              </Card>
            </>
          )}

          <Text style={styles.sectionTitle}>POR PIQUETE</Text>
          {herds.map((h) => {
            const pair = isPairLot(h.categories);
            const hasParent = h.categories.some((c) =>
              c.category === 'VACA PARIDA' || c.category === 'VACA PRENHA' ||
              c.category === 'VACA SOLTEIRA' || c.category === 'NOVILHA' ||
              c.category === 'NOVILHA PRENHA'
            );
            const expanded = expandedId === h.paddock_id;
            return (
              <Card key={h.paddock_id}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setExpandedId(expanded ? null : h.paddock_id)}
                  style={styles.paddockHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paddockName}>{h.paddock_name}</Text>
                    <Text style={styles.paddockInfo}>{h.area} ha · {h.total} cab</Text>
                  </View>
                  {expanded
                    ? <ChevronDown size={18} color={NSA.inkMuted} strokeWidth={1.75} />
                    : <ChevronRight size={18} color={NSA.inkMuted} strokeWidth={1.75} />}
                </TouchableOpacity>

                {pair && <Badge label="Lote de pares (vaca + bezerro)" variant="ok" />}

                {h.categories.map((c, i) => (
                  <View key={i} style={styles.catRow}>
                    <Text style={styles.catName}>{c.category}</Text>
                    <Text style={styles.catCount}>{c.head_count} cab</Text>
                  </View>
                ))}

                {expanded && (
                  <View style={styles.expandedActions}>
                    <View style={styles.actionGrid}>
                      <Button
                        title="Mover lote"
                        variant="outline"
                        onPress={() => router.push(`/admin/mover-rebanho?paddockId=${h.paddock_id}`)}
                        style={styles.actionBtn}
                      />
                      <Button
                        title="Evoluir"
                        variant="outline"
                        onPress={() => router.push(`/admin/evoluir?paddockId=${h.paddock_id}`)}
                        style={styles.actionBtn}
                      />
                    </View>
                    <View style={styles.actionGrid}>
                      <Button
                        title="Desalocar"
                        variant="outline"
                        onPress={() => router.push(`/admin/desalocar?paddockId=${h.paddock_id}`)}
                        style={styles.actionBtn}
                      />
                      <Button
                        title="Mortes"
                        variant="outline"
                        onPress={() => router.push(`/admin/morte?paddockId=${h.paddock_id}`)}
                        style={styles.actionBtn}
                      />
                    </View>
                    <Button
                      title="Consumo"
                      variant="outline"
                      onPress={() => router.push(`/admin/consumo?paddockId=${h.paddock_id}`)}
                    />
                    {hasParent && (
                      <View style={styles.actionGrid}>
                        <Button
                          title="Nascimentos"
                          variant="outline"
                          onPress={() => router.push(`/admin/nascimento?paddockId=${h.paddock_id}`)}
                          style={styles.actionBtn}
                        />
                        <Button
                          title="Aborto"
                          variant="outline"
                          onPress={() => router.push(`/admin/aborto?paddockId=${h.paddock_id}`)}
                          style={styles.actionBtn}
                        />
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })}

          <View style={{ height: 12 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginTop: 22,
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: NSA.borderSubtle,
  },
  totalCat: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.medium },
  totalCount: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.semibold },
  muted: { color: NSA.inkMuted, fontFamily: Fonts.regular },
  totalSum: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: NSA.green800,
  },
  totalSumLabel: { fontSize: 14, color: NSA.green800, fontFamily: Fonts.semibold },
  totalSumCount: { fontSize: 14, color: NSA.green800, fontFamily: Fonts.semibold },
  paddockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paddockName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  paddockInfo: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular, marginTop: 2 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  catName: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.regular },
  catCount: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.medium },
  expandedActions: { marginTop: 12, gap: 10 },
  actionGrid: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
});
