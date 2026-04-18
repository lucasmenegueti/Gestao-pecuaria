import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BombonaItem {
  id: number;
  paddock_name: string;
  formula_name: string;
  quantity_sacks: number;
  last_resupply_date: string | null;
}

interface FormulaTotal {
  formula_name: string;
  total: number;
}

export default function EstoqueScreen() {
  const db = useDatabase();
  const [tab, setTab] = useState<'central' | 'bombonas'>('central');
  const [bombonaItems, setBombonaItems] = useState<BombonaItem[]>([]);
  const [centralTotals, setCentralTotals] = useState<FormulaTotal[]>([]);
  const [bombonaTotals, setBombonaTotals] = useState<FormulaTotal[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  async function loadInventory() {
    const central = await db.getAllAsync<FormulaTotal>(`
      SELECT f.name as formula_name, SUM(i.quantity_sacks) as total
      FROM inventory i JOIN formulas f ON f.id = i.formula_id
      WHERE i.location = 'central'
      GROUP BY f.id
      ORDER BY f.name
    `);
    setCentralTotals(central);

    const bombonas = await db.getAllAsync<BombonaItem>(`
      SELECT i.id, p.name as paddock_name, f.name as formula_name,
        i.quantity_sacks, i.last_resupply_date
      FROM inventory i
      JOIN formulas f ON f.id = i.formula_id
      JOIN paddocks p ON p.id = i.paddock_id
      WHERE i.location = 'bombona'
      ORDER BY i.quantity_sacks ASC
    `);
    setBombonaItems(bombonas);

    const bombTotals = await db.getAllAsync<FormulaTotal>(`
      SELECT f.name as formula_name, SUM(i.quantity_sacks) as total
      FROM inventory i JOIN formulas f ON f.id = i.formula_id
      WHERE i.location = 'bombona'
      GROUP BY f.id
      ORDER BY f.name
    `);
    setBombonaTotals(bombTotals);
  }

  const totals = tab === 'central' ? centralTotals : bombonaTotals;
  const grandTotal = totals.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estoque</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'central' && styles.tabActive]}
          onPress={() => setTab('central')}
        >
          <Text style={[styles.tabText, tab === 'central' && styles.tabTextActive]}>CENTRAL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'bombonas' && styles.tabActive]}
          onPress={() => setTab('bombonas')}
        >
          <Text style={[styles.tabText, tab === 'bombonas' && styles.tabTextActive]}>BOMBONAS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>TOTAIS POR INSUMO</Text>
        <Card>
          {totals.length === 0 ? (
            <Text style={styles.emptyRow}>Sem estoque nesta localização.</Text>
          ) : (
            totals.map((t) => (
              <View key={t.formula_name} style={styles.totalRow}>
                <Text style={styles.totalCat}>{t.formula_name}</Text>
                <Text style={styles.totalCount}>{t.total || 0} sacos</Text>
              </View>
            ))
          )}
          <View style={[styles.totalRow, styles.totalSum]}>
            <Text style={styles.totalSumLabel}>TOTAL</Text>
            <Text style={styles.totalSumCount}>{grandTotal} sacos</Text>
          </View>
        </Card>

        {tab === 'central' ? (
          <>
            <Button
              title="ENTRADA DE ESTOQUE"
              variant="success"
              onPress={() => router.push('/estoque/entrada')}
              size="large"
              style={{ marginTop: 16 }}
            />
            <TouchableOpacity
              onPress={() => router.push('/estoque/ajuste')}
              style={styles.adjustBtn}
            >
              <Text style={styles.adjustBtnText}>Ajuste manual (perda)</Text>
            </TouchableOpacity>
            <Text style={styles.adjustHint}>
              Saídas normais são feitas via reabastecimento (trator → bombona).
              Ajuste manual só para registrar perda, desvio ou diferença de inventário.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>POR BOMBONA</Text>
            {bombonaItems.length === 0 && (
              <Text style={styles.emptyRow}>Nenhuma bombona cadastrada.</Text>
            )}
            {bombonaItems.map((item) => {
              const variant = item.quantity_sacks === 0 ? 'danger' : item.quantity_sacks <= 2 ? 'warning' : 'ok';
              return (
                <Card key={item.id} borderColor={variant === 'danger' ? Colors.danger : variant === 'warning' ? Colors.warning : Colors.success}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.paddock_name.toUpperCase()}</Text>
                    <Badge label={variant === 'ok' ? 'OK' : variant === 'warning' ? 'ATENÇÃO' : 'CRÍTICO'} variant={variant} />
                  </View>
                  <Text style={styles.itemQty}>{item.formula_name}: {item.quantity_sacks} sacos</Text>
                  {item.last_resupply_date && (
                    <Text style={styles.itemMin}>Últ. reab: {item.last_resupply_date}</Text>
                  )}
                </Card>
              );
            })}

            <Button
              title="REABASTECER BOMBONAS"
              variant="warning"
              onPress={() => router.push('/reabastecimento/carregar')}
              icon="🚜"
              style={{ marginTop: 16 }}
            />
          </>
        )}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalCat: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  totalCount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  totalSum: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: Colors.primary, paddingTop: 12, marginTop: 4 },
  totalSumLabel: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  totalSumCount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  emptyRow: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  itemQty: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 4 },
  itemMin: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  bar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginTop: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1 },
  adjustBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adjustBtnText: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  adjustHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 15,
    paddingHorizontal: 8,
  },
});
