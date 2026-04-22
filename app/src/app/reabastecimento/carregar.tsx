import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, SliderInput, BrandHeader } from '@/components/ui';
import { NSA, Fonts } from '@/theme/nsa';
import { getActiveRoute } from '@/lib/reabastecimento/active-route';
import { sacos } from '@/constants';

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Guard: se já tem rota ativa, redireciona imediatamente — evita criar
    // uma 2ª rota que confundiria o inventário "em trânsito". Flag `cancelled`
    // evita navegação/setState com dado velho se usuário sair da tela antes do
    // .then chain resolver (volta rápido, async race).
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveRoute(db);
        if (cancelled) return;
        if (active) {
          router.replace(`/reabastecimento/rota?routeId=${active.id}`);
          return;
        }
        const rows = await db.getAllAsync<{ formula_id: number; name: string; quantity_sacks: number }>(
          "SELECT i.formula_id, f.name, i.quantity_sacks FROM inventory i JOIN formulas f ON f.id=i.formula_id WHERE i.location='central' AND i.quantity_sacks > 0"
        );
        if (cancelled) return;
        setItems(rows.map((r) => ({ formula_id: r.formula_id, name: r.name, available: r.quantity_sacks, loading: 0, selected: false })));
      } catch (e) {
        if (cancelled) return;
        if (__DEV__) console.warn('[carregar] boot falhou:', (e as Error)?.message);
        Alert.alert('Erro', 'Falha ao carregar estoque. Volte e tente de novo.');
      }
    })();
    return () => { cancelled = true; };
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
    if (selectedItems.length === 0 || submitting) return;
    if (!user?.id) {
      if (__DEV__) console.warn('[carregar] sem user autenticado, abortando');
      return;
    }
    setSubmitting(true);
    let routeId: number | null = null;
    try {
      // Transação: rota + loads + deduções da central caem juntas. Se qualquer
      // passo falhar, SQLite faz rollback e nenhum saco some da central sem ter
      // uma rota que o represente.
      await db.withTransactionAsync(async () => {
        const result = await db.runAsync(
          "INSERT INTO resupply_routes (user_id, start_time, status) VALUES (?, datetime('now','localtime'), 'in_progress')",
          [user.id]
        );
        routeId = result.lastInsertRowId;
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
            [item.formula_id, -item.loading, `Carregamento rota #${routeId}`, user.id]
          );
        }
      });
      if (routeId !== null) {
        router.replace(`/reabastecimento/rota?routeId=${routeId}`);
      } else {
        // Não deveria acontecer (se transação OK, routeId foi setado), mas
        // evita botão travado em "Iniciando…" eternamente.
        setSubmitting(false);
      }
    } catch (err) {
      if (__DEV__) console.error('[carregar] falha ao criar rota', err);
      Alert.alert('Erro', 'Falha ao iniciar rota. Nenhum saco foi retirado do estoque.');
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Carregar trator" context="Fase 1 · O que vai levar" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {items.length === 0 && (
            <Card>
              <Text style={styles.emptyTitle}>Sem ração disponível na central</Text>
              <Text style={styles.emptyText}>
                Registre uma entrada em Estoque → Central para poder carregar o trator.
              </Text>
              <Button
                title="Ir para estoque"
                variant="outline"
                onPress={() => router.replace('/(tabs)/estoque')}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}
          {items.map((item, idx) => (
            <Card key={idx} borderColor={item.selected ? NSA.green800 : undefined}>
              <TouchableOpacity onPress={() => toggleItem(idx)} activeOpacity={0.85}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemAvail}>Central · {sacos(item.available)}</Text>
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
                  label="Levando"
                />
              )}
            </Card>
          ))}

          {totalSacks > 0 && (
            <Card borderColor={NSA.green800}>
              <Text style={styles.totalLabel}>NO TRATOR</Text>
              {selectedItems.map((i, idx) => (
                <Text key={idx} style={styles.totalItem}>{sacos(i.loading)} · {i.name}</Text>
              ))}
              <Text style={styles.totalSum}>Total · {sacos(totalSacks)}</Text>
            </Card>
          )}
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button
            title={submitting ? 'Iniciando…' : 'Iniciar rota'}
            onPress={handleStart}
            disabled={totalSacks === 0 || submitting}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemAvail: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular },
  totalLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  totalItem: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.regular, marginTop: 2 },
  totalSum: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.green800, marginTop: 10 },
  emptyTitle: { fontSize: 15, fontFamily: Fonts.semibold, color: NSA.inkPrimary, textAlign: 'center', letterSpacing: -0.15 },
  emptyText: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 8, lineHeight: 18, fontFamily: Fonts.regular },
});
