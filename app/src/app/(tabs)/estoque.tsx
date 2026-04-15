import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, CardTitle, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants';

interface CentralItem {
  id: number;
  formula_name: string;
  quantity_sacks: number;
  min_sacks: number;
}

interface BombonaItem {
  id: number;
  paddock_name: string;
  formula_name: string;
  quantity_sacks: number;
  last_resupply_date: string | null;
}

export default function EstoqueScreen() {
  const db = useDatabase();
  const [tab, setTab] = useState<'central' | 'bombonas'>('central');
  const [centralItems, setCentralItems] = useState<CentralItem[]>([]);
  const [bombonaItems, setBombonaItems] = useState<BombonaItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  async function loadInventory() {
    const central = await db.getAllAsync<CentralItem>(`
      SELECT i.id, f.name as formula_name, i.quantity_sacks, i.min_sacks
      FROM inventory i JOIN formulas f ON f.id = i.formula_id
      WHERE i.location = 'central'
      ORDER BY i.quantity_sacks ASC
    `);
    setCentralItems(central);

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
  }

  function getStockStatus(qty: number, min: number): { label: string; variant: 'ok' | 'warning' | 'danger' } {
    if (qty <= min * 0.3) return { label: 'CRÍTICO', variant: 'danger' };
    if (qty <= min) return { label: 'BAIXO', variant: 'warning' };
    return { label: 'OK', variant: 'ok' };
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estoque</Text>
      </View>

      {/* Tab switch */}
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
        {tab === 'central' ? (
          <>
            {centralItems.map((item) => {
              const { label, variant } = getStockStatus(item.quantity_sacks, item.min_sacks);
              const pct = Math.min(100, (item.quantity_sacks / Math.max(item.min_sacks * 3, 1)) * 100);
              return (
                <Card key={item.id}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.formula_name.toUpperCase()}</Text>
                    <Badge label={label} variant={variant} />
                  </View>
                  <Text style={styles.itemQty}>{item.quantity_sacks} sacos</Text>
                  <Text style={styles.itemMin}>Mínimo: {item.min_sacks} sacos</Text>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: variant === 'ok' ? Colors.success : variant === 'warning' ? Colors.warning : Colors.danger }]} />
                  </View>
                </Card>
              );
            })}

            <View style={styles.actionRow}>
              <Button title="ENTRADA" variant="success" onPress={() => router.push('/estoque/entrada')} style={styles.actionBtn} />
              <Button title="SAÍDA" variant="danger" onPress={() => router.push('/estoque/saida')} style={styles.actionBtn} />
            </View>
          </>
        ) : (
          <>
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
          </>
        )}

        <Button
          title="REABASTECER BOMBONAS"
          variant="warning"
          onPress={() => router.push('/reabastecimento/carregar')}
          icon="🚜"
          style={{ marginTop: 16 }}
        />
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
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  itemQty: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 4 },
  itemMin: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  bar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginTop: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1 },
});
