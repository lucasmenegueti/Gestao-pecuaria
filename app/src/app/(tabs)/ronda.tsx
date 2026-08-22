import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { useRondaStore } from '@/stores/rondaStore';
import { StatusPill, BrandHeader, KeyboardAvoider} from '@/components/ui';
import { NSA, Fonts, Radius, tokensForStatus } from '@/theme/nsa';
import { calculateSupplementDays, dailyConsumptionKg, piquetes } from '@/constants';
import { formatDayMonth } from '@/lib/dates';

interface PaddockRow {
  id: number;
  name: string;
  area_hectares: number;
  grass_name: string;
  total_heads: number;
  bombona_sacks: number | null;
  formula_kg: number | null;
  formula_g_per_kg_body_day: number | null;
  last_ronda: string | null;
}

interface HerdLot {
  paddock_id: number;
  category: string;
  head_count: number;
  avg_weight_kg: number | null;
}

type Status = 'ok' | 'warn' | 'danger';

export default function RondaScreen() {
  const db = useDatabase();
  const setCurrentPaddock = useRondaStore((s) => s.setCurrentPaddock);
  const [paddocks, setPaddocks] = useState<PaddockRow[]>([]);
  const [lotsByPaddock, setLotsByPaddock] = useState<Record<number, HerdLot[]>>({});
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { loadPaddocks(); }, []));

  async function loadPaddocks() {
    const rows = await db.getAllAsync<PaddockRow>(`
      SELECT p.id, p.name, p.area_hectares,
        gt.name as grass_name,
        SUM(h.head_count) as total_heads,
        (SELECT i.quantity_sacks FROM inventory i WHERE i.paddock_id = p.id AND i.location = 'bombona' LIMIT 1) as bombona_sacks,
        (SELECT f.kg_per_sack FROM inventory i JOIN formulas f ON f.id = i.formula_id WHERE i.paddock_id = p.id AND i.location = 'bombona' LIMIT 1) as formula_kg,
        (SELECT f.target_g_per_kg_body_day FROM inventory i JOIN formulas f ON f.id = i.formula_id WHERE i.paddock_id = p.id AND i.location = 'bombona' LIMIT 1) as formula_g_per_kg_body_day,
        (SELECT MAX(r.date) FROM rondas r WHERE r.paddock_id = p.id) as last_ronda
      FROM paddocks p
      JOIN grass_types gt ON gt.id = p.grass_type_id
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0
      GROUP BY p.id
      ORDER BY p.name
    `);
    setPaddocks(rows);
    const lots = await db.getAllAsync<HerdLot>(
      'SELECT paddock_id, category, head_count, avg_weight_kg FROM herd WHERE paddock_id IS NOT NULL AND head_count > 0'
    );
    const map: Record<number, HerdLot[]> = {};
    for (const l of lots) {
      (map[l.paddock_id] ||= []).push(l);
    }
    setLotsByPaddock(map);
  }

  function getStatus(p: PaddockRow): { status: Status; message: string } {
    if (p.bombona_sacks !== null && p.bombona_sacks === 0) {
      return { status: 'danger', message: 'Cocho vazio' };
    }
    if (p.bombona_sacks !== null && p.formula_kg && p.formula_g_per_kg_body_day) {
      const daily = dailyConsumptionKg(lotsByPaddock[p.id] ?? [], p.formula_g_per_kg_body_day);
      const days = calculateSupplementDays(p.bombona_sacks, p.formula_kg, daily);
      if (days <= 1) return { status: 'danger', message: `Cocho · ${days} dia restante` };
      if (days <= 3) return { status: 'warn', message: `Cocho · ${days} dias restantes` };
      return { status: 'ok', message: `Cocho · ${days} dias restantes` };
    }
    return { status: 'ok', message: '' };
  }

  function handleSelect(p: PaddockRow) {
    setCurrentPaddock(p.id, p.name, p.total_heads, p.area_hectares, p.grass_name);
    router.push(`/ronda/${p.id}/menu`);
  }

  const filtered = search
    ? paddocks.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : paddocks;

  return (
    <View style={styles.root}>
      <BrandHeader title="Ronda" context={`${piquetes(paddocks.length)} com gado`} />
      <KeyboardAvoider>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={styles.searchBar}>
          <Search size={16} color={NSA.inkMuted} strokeWidth={1.75} style={{ marginLeft: 2 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar piquete"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={NSA.inkDisabled}
          />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {filtered.map((p) => {
            const { status, message } = getStatus(p);
            const t = tokensForStatus(status);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleSelect(p)}
                activeOpacity={0.85}
                style={[styles.paddockCard, { borderLeftColor: t.edge }]}
              >
                <View style={styles.paddockHeader}>
                  <Text style={styles.paddockName}>{p.name}</Text>
                  <StatusPill kind={status}>{t.label}</StatusPill>
                </View>
                <Text style={styles.paddockInfo}>
                  {p.area_hectares} ha · {p.grass_name} · <Text style={styles.paddockHeads}>{p.total_heads} cab</Text>
                </Text>
                <View style={styles.paddockFooter}>
                  <Text style={styles.lastRonda}>
                    {p.last_ronda ? `Última ronda ${formatDayMonth(p.last_ronda)}` : 'Sem ronda registrada'}
                  </Text>
                  {message ? (
                    <Text style={[styles.statusMsg, { color: status === 'ok' ? NSA.inkSecondary : t.fg }]}>
                      {message}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: NSA.inkPrimary,
    fontFamily: Fonts.regular,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 14 },
  paddockCard: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderLeftWidth: 3,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 10,
  },
  paddockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paddockName: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
  },
  paddockInfo: {
    fontSize: 12,
    color: NSA.inkSecondary,
    marginBottom: 8,
    fontFamily: Fonts.regular,
  },
  paddockHeads: { color: NSA.inkPrimary, fontFamily: Fonts.medium },
  paddockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastRonda: {
    fontSize: 12,
    color: NSA.inkMuted,
    fontFamily: Fonts.regular,
  },
  statusMsg: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});
