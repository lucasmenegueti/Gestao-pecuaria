import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useRondaStore } from '@/stores/rondaStore';
import { Card, Badge } from '@/components/ui';
import { Colors, calculateSupplementDays, dailyConsumptionKg } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function RondaScreen() {
  const db = useDatabase();
  const setCurrentPaddock = useRondaStore((s) => s.setCurrentPaddock);
  const [paddocks, setPaddocks] = useState<PaddockRow[]>([]);
  const [lotsByPaddock, setLotsByPaddock] = useState<Record<number, HerdLot[]>>({});
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadPaddocks();
    }, [])
  );

  async function loadPaddocks() {
    // Só piquetes com gado alocado aparecem na ronda — piquete vazio não precisa de avaliação.
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

  function getStatus(p: PaddockRow): { status: 'ok' | 'warning' | 'danger'; message: string } {
    if (p.bombona_sacks !== null && p.bombona_sacks === 0) {
      return { status: 'danger', message: 'Cocho VAZIO!' };
    }
    if (p.bombona_sacks !== null && p.formula_kg && p.formula_g_per_kg_body_day) {
      const daily = dailyConsumptionKg(lotsByPaddock[p.id] ?? [], p.formula_g_per_kg_body_day);
      const days = calculateSupplementDays(p.bombona_sacks, p.formula_kg, daily);
      if (days <= 1) return { status: 'danger', message: `Cocho: ${days} dia restante` };
      if (days <= 3) return { status: 'warning', message: `Cocho: ${days} dias restantes` };
      return { status: 'ok', message: `Cocho: ${days} dias restantes` };
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ronda de Gado</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar piquete..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.map((p) => {
          const { status, message } = getStatus(p);
          return (
            <Card
              key={p.id}
              onPress={() => handleSelect(p)}
              borderColor={status === 'danger' ? Colors.danger : status === 'warning' ? Colors.warning : Colors.success}
            >
              <View style={styles.paddockHeader}>
                <Text style={styles.paddockName}>{p.name.toUpperCase()}</Text>
                <Badge
                  label={status === 'ok' ? 'OK' : status === 'warning' ? 'ATENÇÃO' : 'ALERTA'}
                  variant={status === 'ok' ? 'ok' : status === 'warning' ? 'warning' : 'danger'}
                />
              </View>
              <Text style={styles.paddockInfo}>
                {p.total_heads} cab • {p.area_hectares} ha • {p.grass_name}
              </Text>
              {message ? <Text style={styles.paddockStatus}>{message}</Text> : null}
              {p.last_ronda && (
                <Text style={styles.lastRonda}>Última ronda: {p.last_ronda}</Text>
              )}
            </Card>
          );
        })}
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
  searchBar: { padding: 16, paddingBottom: 8 },
  searchInput: {
    height: 48,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8 },
  paddockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paddockName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  paddockInfo: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  paddockStatus: { fontSize: 14, fontWeight: '600', color: Colors.warning, marginTop: 4 },
  lastRonda: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
