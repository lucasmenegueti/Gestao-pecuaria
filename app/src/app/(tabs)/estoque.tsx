import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Truck, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { Alert } from 'react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, StatusPill, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius, tokensForStatus } from '@/theme/nsa';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import {
  getActiveRoute,
  getInTransitTotals,
  countActiveRoutes,
  cancelStaleRoutes,
  type ActiveRoute,
  type InTransitTotal,
} from '@/lib/reabastecimento/active-route';

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
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [inTransit, setInTransit] = useState<InTransitTotal[]>([]);
  const [staleRoutesCount, setStaleRoutesCount] = useState(0);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  async function loadInventory() {
    const [active, transit, activeCount] = await Promise.all([
      getActiveRoute(db),
      getInTransitTotals(db),
      countActiveRoutes(db),
    ]);
    setActiveRoute(active);
    setInTransit(transit);
    // staleRoutesCount = quantas além da mais recente (que é a "ativa" legítima)
    setStaleRoutesCount(Math.max(0, activeCount - 1));

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

  function handleCleanupStale() {
    Alert.alert(
      'Limpar rotas antigas?',
      `${staleRoutesCount} rota(s) antiga(s) permanece(m) em andamento por bug de versão anterior. O que vai acontecer:\n\n• Os sacos ainda no trator dessas rotas voltam ao estoque central\n• As entregas já registradas nas bombonas continuam\n• A rota mais recente NÃO é mexida`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              const r = await cancelStaleRoutes(db, userId);
              Alert.alert(
                'Limpeza concluída',
                `${r.cancelled} rota(s) cancelada(s), ${r.returnedToStock} saco(s) voltaram ao central.`,
              );
              loadInventory();
            } catch (err) {
              if (__DEV__) console.error('[estoque] cleanup falhou', err);
              Alert.alert('Erro', 'Falha ao limpar rotas antigas.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Estoque" context={`${grandTotal} sacos · ${tab === 'central' ? 'central' : 'bombonas'}`} />
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'central' && styles.tabActive]}
          onPress={() => setTab('central')}
        >
          <Text style={[styles.tabText, tab === 'central' && styles.tabTextActive]}>Central</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'bombonas' && styles.tabActive]}
          onPress={() => setTab('bombonas')}
        >
          <Text style={[styles.tabText, tab === 'bombonas' && styles.tabTextActive]}>Bombonas</Text>
        </TouchableOpacity>
      </View>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {staleRoutesCount > 0 && (
          <TouchableOpacity onPress={handleCleanupStale} style={styles.staleBanner} activeOpacity={0.85}>
            <AlertTriangle size={16} color={NSA.warnFg} strokeWidth={1.75} />
            <View style={{ flex: 1 }}>
              <Text style={styles.staleTitle}>{staleRoutesCount} rota(s) antiga(s) penduradas</Text>
              <Text style={styles.staleDetail}>Toque pra limpar. Sacos voltam ao central.</Text>
            </View>
            <ChevronRight size={16} color={NSA.warnFg} strokeWidth={1.75} />
          </TouchableOpacity>
        )}
        {activeRoute && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/reabastecimento/rota?routeId=${activeRoute.id}`)}
            style={styles.activeRouteBanner}
          >
            <View style={styles.activeRouteIcon}>
              <Truck size={18} color={NSA.infoFg} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeRouteTitle}>Rota em andamento</Text>
              <Text style={styles.activeRouteDetail}>
                {activeRoute.total_remaining} sacos no trator · iniciada {formatStarted(activeRoute.start_time)}
              </Text>
            </View>
            <ChevronRight size={16} color={NSA.infoFg} strokeWidth={1.75} />
          </TouchableOpacity>
        )}

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
            {inTransit.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>NO TRATOR (rotas em andamento)</Text>
                <Card borderColor={NSA.info}>
                  {inTransit.map((t) => (
                    <View key={t.formula_id} style={styles.totalRow}>
                      <Text style={styles.totalCat}>{t.formula_name}</Text>
                      <Text style={styles.totalCount}>{t.total} sacos</Text>
                    </View>
                  ))}
                  <Text style={styles.inTransitHint}>
                    Contabilizados fora da central até a rota ser encerrada ou cancelada.
                  </Text>
                </Card>
              </>
            )}

            <TouchableOpacity
              onPress={() => router.push('/estoque/ajuste')}
              style={styles.adjustBtn}
            >
              <Text style={styles.adjustBtnText}>Ajuste manual (entrada ou perda)</Text>
            </TouchableOpacity>
            <Text style={styles.adjustHint}>
              Saídas normais são feitas via reabastecimento (trator → bombona).
              Ajuste manual só para registrar perda, desvio, entrada extra ou diferença de inventário.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>POR BOMBONA</Text>
            {bombonaItems.length === 0 && (
              <Text style={styles.emptyRow}>Nenhuma bombona cadastrada.</Text>
            )}
            {bombonaItems.map((item) => {
              const kind = item.quantity_sacks === 0 ? 'danger' : item.quantity_sacks <= 2 ? 'warn' : 'ok';
              const t = tokensForStatus(kind);
              const label = kind === 'danger' ? 'Crítico' : t.label;
              return (
                <Card key={item.id} borderColor={t.edge}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.paddock_name}</Text>
                    <StatusPill kind={kind}>{label}</StatusPill>
                  </View>
                  <Text style={styles.itemQty}>{item.formula_name} · {item.quantity_sacks} sacos</Text>
                  {item.last_resupply_date && (
                    <Text style={styles.itemMin}>Últ. reab {item.last_resupply_date}</Text>
                  )}
                </Card>
              );
            })}
          </>
        )}
        </ScrollView>

        <View style={styles.stickyFooter}>
          {tab === 'central' ? (
            <Button
              title="Entrada de estoque"
              onPress={() => router.push('/estoque/entrada')}
            />
          ) : (
            <Button
              title={activeRoute ? 'Continuar rota em andamento' : 'Reabastecer bombonas'}
              onPress={() =>
                activeRoute
                  ? router.push(`/reabastecimento/rota?routeId=${activeRoute.id}`)
                  : router.push('/reabastecimento/carregar')
              }
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function formatStarted(iso: string): string {
  // iso vem como 'YYYY-MM-DD HH:MM:SS' (datetime('now','localtime')).
  const parsed = new Date(iso.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) return iso;
  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();
  const hh = parsed.getHours().toString().padStart(2, '0');
  const mm = parsed.getMinutes().toString().padStart(2, '0');
  return sameDay ? `às ${hh}:${mm}` : `em ${parsed.toLocaleDateString('pt-BR')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: NSA.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: NSA.green800 },
  tabText: { fontSize: 14, fontFamily: Fonts.medium, color: NSA.inkMuted },
  tabTextActive: { color: NSA.green800, fontFamily: Fonts.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  stickyFooter: {
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginTop: 18,
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
  totalSum: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: NSA.green800,
    paddingTop: 12,
    marginTop: 4,
  },
  totalSumLabel: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.green800 },
  totalSumCount: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.green800 },
  emptyRow: { fontSize: 13, color: NSA.inkMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemQty: { fontSize: 14, fontFamily: Fonts.medium, color: NSA.inkPrimary, marginTop: 4 },
  itemMin: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular, marginTop: 2 },
  adjustBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: NSA.border,
  },
  adjustBtnText: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.danger },
  adjustHint: {
    fontSize: 11,
    color: NSA.inkMuted,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Fonts.regular,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  activeRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NSA.infoBg,
    borderWidth: 1,
    borderColor: NSA.info,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 6,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NSA.warnBg,
    borderWidth: 1,
    borderColor: NSA.warn,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
  },
  staleTitle: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.warnFg, letterSpacing: -0.1 },
  staleDetail: { fontSize: 11, color: NSA.inkSecondary, fontFamily: Fonts.regular, marginTop: 2 },
  activeRouteIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.lg,
    backgroundColor: NSA.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRouteTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: NSA.infoFg,
    letterSpacing: -0.15,
  },
  activeRouteDetail: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: NSA.inkSecondary,
    marginTop: 2,
  },
  inTransitHint: {
    fontSize: 11,
    color: NSA.inkMuted,
    fontFamily: Fonts.regular,
    marginTop: 10,
    lineHeight: 15,
  },
});
