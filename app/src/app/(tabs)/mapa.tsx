import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Badge } from '@/components/ui';
import { Colors } from '@/constants';

interface PaddockMap {
  id: number;
  name: string;
  total_heads: number;
  area_hectares: number;
  status: 'ok' | 'warning' | 'danger';
}

export default function MapaScreen() {
  const db = useDatabase();
  const [paddocks, setPaddocks] = useState<PaddockMap[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadMap();
    }, [])
  );

  async function loadMap() {
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      area_hectares: number;
      total_heads: number;
      bombona_sacks: number | null;
    }>(`
      SELECT p.id, p.name, p.area_hectares,
        COALESCE((SELECT SUM(h.head_count) FROM herd h WHERE h.paddock_id = p.id), 0) as total_heads,
        (SELECT i.quantity_sacks FROM inventory i WHERE i.paddock_id = p.id AND i.location = 'bombona' LIMIT 1) as bombona_sacks
      FROM paddocks p WHERE p.active = 1 ORDER BY p.name
    `);

    setPaddocks(rows.map((r) => ({
      ...r,
      status: r.bombona_sacks === 0 ? 'danger' : (r.bombona_sacks !== null && r.bombona_sacks <= 2) ? 'warning' : 'ok',
    })));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapa da Fazenda</Text>
      </View>

      {/* Simplified map view — grid of paddock cards with status */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapContainer}>
          {paddocks.map((p) => (
            <View
              key={p.id}
              style={[
                styles.mapTile,
                {
                  backgroundColor:
                    p.status === 'danger' ? '#fce4ec' :
                    p.status === 'warning' ? '#fff3e0' : '#e8f5e9',
                  borderColor:
                    p.status === 'danger' ? Colors.danger :
                    p.status === 'warning' ? Colors.warning : Colors.success,
                },
              ]}
            >
              <Text style={styles.tileName}>{p.name}</Text>
              <Text style={styles.tileHeads}>{p.total_heads} cab</Text>
              <Text style={styles.tileArea}>{p.area_hectares} ha</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.legendTitle}>Legenda</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>OK</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Atenção</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendText}>Alerta</Text>
          </View>
        </Card>

        <Text style={styles.note}>
          📍 Mapa interativo será habilitado com GPS no campo
        </Text>
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
  scrollContent: { padding: 16 },
  mapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapTile: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  tileName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  tileHeads: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 4 },
  tileArea: { fontSize: 12, color: Colors.textMuted },
  legendTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 14, color: Colors.text },
  note: { textAlign: 'center', color: Colors.textMuted, marginTop: 16, fontSize: 14 },
});
