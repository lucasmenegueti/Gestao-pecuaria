import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadItem {
  formula_id: number;
  name: string;
  available: number;
  loading: number;
  selected: boolean;
}

export default function CarregarScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<LoadItem[]>([]);

  useEffect(() => {
    db.getAllAsync<{ formula_id: number; name: string; quantity_sacks: number }>(
      "SELECT i.formula_id, f.name, i.quantity_sacks FROM inventory i JOIN formulas f ON f.id=i.formula_id WHERE i.location='central' AND i.quantity_sacks > 0"
    ).then((rows) =>
      setItems(rows.map((r) => ({ formula_id: r.formula_id, name: r.name, available: r.quantity_sacks, loading: 0, selected: false })))
    );
  }, []);

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected, loading: item.selected ? 0 : Math.min(30, item.available) } : item));
  }

  function updateLoading(idx: number, val: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, loading: val } : item));
  }

  const selectedItems = items.filter((i) => i.selected && i.loading > 0);
  const totalSacks = selectedItems.reduce((s, i) => s + i.loading, 0);

  async function handleStart() {
    if (selectedItems.length === 0) return;
    if (!user?.id) {
      console.warn('[carregar] sem user autenticado, abortando');
      return;
    }
    try {
      const result = await db.runAsync(
        "INSERT INTO resupply_routes (user_id, start_time, status) VALUES (?, datetime('now','localtime'), 'in_progress')",
        [user.id]
      );
      const routeId = result.lastInsertRowId;
      for (const item of selectedItems) {
        await db.runAsync(
          'INSERT INTO resupply_loads (route_id, formula_id, sacks_loaded) VALUES (?,?,?)',
          [routeId, item.formula_id, item.loading]
        );
        await db.runAsync(
          "UPDATE inventory SET quantity_sacks = MAX(0, quantity_sacks - ?) WHERE formula_id=? AND location='central'",
          [item.loading, item.formula_id]
        );
        await db.runAsync(
          `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
           VALUES ('SAIDA_CENTRAL_ROTA', ?, NULL, ?, ?, ?)`,
          [item.formula_id, -item.loading, `Carregamento rota #${routeId}`, user?.id ?? null]
        );
      }
      router.replace(`/reabastecimento/rota?routeId=${routeId}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FASE 1: CARREGAMENTO</Text>
        <Text style={styles.subtitle}>O que vai levar?</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {items.length === 0 && (
          <Card>
            <Text style={styles.emptyTitle}>Sem ração disponível na central</Text>
            <Text style={styles.emptyText}>
              Registre uma ENTRADA em Estoque → Central para poder carregar o trator.
            </Text>
            <Button
              title="IR PARA ESTOQUE"
              variant="outline"
              onPress={() => router.replace('/(tabs)/estoque')}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
        {items.map((item, idx) => (
          <Card key={idx} borderColor={item.selected ? Colors.suplementacao : undefined}>
            <TouchableOpacity onPress={() => toggleItem(idx)}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.selected ? '✅ ' : ''}{item.name.toUpperCase()}</Text>
                <Text style={styles.itemAvail}>Central: {item.available} sacos</Text>
              </View>
            </TouchableOpacity>
            {item.selected && (
              <SliderInput
                value={item.loading}
                onValueChange={(v) => updateLoading(idx, v)}
                min={1}
                max={item.available}
                step={1}
                unit="sacos"
                label="Levando:"
                color={Colors.suplementacao}
              />
            )}
          </Card>
        ))}

        {totalSacks > 0 && (
          <Card style={{ backgroundColor: '#fff3e0' }}>
            <Text style={styles.totalLabel}>NO TRATOR:</Text>
            {selectedItems.map((i, idx) => (
              <Text key={idx} style={styles.totalItem}>{i.loading} sacos {i.name}</Text>
            ))}
            <Text style={styles.totalSum}>= {totalSacks} sacos total</Text>
          </Card>
        )}

        <Button
          title="INICIAR ROTA"
          variant="warning"
          onPress={handleStart}
          disabled={totalSacks === 0}
          size="large"
          icon="🚜"
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
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  itemAvail: { fontSize: 14, color: '#7a7a7a' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#e67e22', marginBottom: 4 },
  totalItem: { fontSize: 14, color: '#2c2c2c' },
  totalSum: { fontSize: 16, fontWeight: '700', color: '#2c2c2c', marginTop: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#2c2c2c', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#7a7a7a', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
