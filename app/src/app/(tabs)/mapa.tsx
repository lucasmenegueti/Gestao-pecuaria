import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useRondaStore } from '@/stores/rondaStore';
import { Colors } from '@/constants';
import { FarmMap, PaddockGeo, WaterTank } from '@/components/map';
import type { MapMode } from '@/components/map/types';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Row extends PaddockGeo {
  total_heads: number;
  grass_name: string;
  has_ronda_today: boolean;
}

export default function MapaScreen() {
  const db = useDatabase();
  const setCurrentPaddock = useRondaStore((s) => s.setCurrentPaddock);
  const [paddocks, setPaddocks] = useState<Row[]>([]);
  const [tanks, setTanks] = useState<WaterTank[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<MapMode>('gado');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    // Data local (YYYY-MM-DD) para comparar contra rondas.date
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    type DBRow = {
      id: number;
      name: string;
      area_hectares: number;
      center_lat: number;
      center_lng: number;
      geometry: string;
      grass_name: string;
      total_heads: number;
      has_ronda_today: number;
    };
    const rows = await db.getAllAsync<DBRow>(
      `
      SELECT p.id, p.name, p.area_hectares, p.center_lat, p.center_lng, p.geometry,
        gt.name AS grass_name,
        COALESCE((SELECT SUM(h.head_count) FROM herd h WHERE h.paddock_id = p.id), 0) AS total_heads,
        CASE WHEN EXISTS (SELECT 1 FROM rondas r WHERE r.paddock_id = p.id AND r.date = ?)
          THEN 1 ELSE 0 END AS has_ronda_today
      FROM paddocks p
      JOIN grass_types gt ON gt.id = p.grass_type_id
      WHERE p.active = 1 AND p.geometry IS NOT NULL
      ORDER BY p.name
    `,
      [today]
    );
    setPaddocks(
      rows.map((r) => ({
        ...r,
        has_ronda_today: r.has_ronda_today === 1,
      }))
    );
    const t = await db.getAllAsync<WaterTank>('SELECT id, name, lat, lng FROM water_tanks');
    setTanks(t);
  }

  const selected = paddocks.find((p) => p.id === selectedId) ?? null;

  function openPaddock(p: Row) {
    setCurrentPaddock(p.id, p.name, p.total_heads, p.area_hectares, p.grass_name);
    router.push(`/ronda/${p.id}/menu`);
  }

  // Contagens no header pra dar contexto
  const withCattle = paddocks.filter((p) => p.total_heads > 0).length;
  const rondasToday = paddocks.filter((p) => p.total_heads > 0 && p.has_ronda_today).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapa da Fazenda</Text>
        <Text style={styles.headerSub}>
          {paddocks.length} piquetes • {tanks.length} caixas d'água
        </Text>
      </View>

      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'gado' && styles.modeBtnActive]}
          onPress={() => setMode('gado')}
        >
          <Text style={[styles.modeBtnText, mode === 'gado' && styles.modeBtnTextActive]}>
            GADO
          </Text>
          <Text style={[styles.modeBtnSub, mode === 'gado' && styles.modeBtnSubActive]}>
            {withCattle} com gado
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'ronda' && styles.modeBtnActive]}
          onPress={() => setMode('ronda')}
        >
          <Text style={[styles.modeBtnText, mode === 'ronda' && styles.modeBtnTextActive]}>
            RONDA
          </Text>
          <Text style={[styles.modeBtnSub, mode === 'ronda' && styles.modeBtnSubActive]}>
            {rondasToday}/{withCattle} hoje
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrap}>
        <FarmMap
          paddocks={paddocks}
          waterTanks={tanks}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          mode={mode}
        />
      </View>

      {selected && (
        <View style={styles.selectedBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedName}>{selected.name}</Text>
            <Text style={styles.selectedInfo}>
              {selected.area_hectares.toFixed(1)} ha • {selected.total_heads} cab
              {mode === 'ronda' && selected.total_heads > 0 && (
                <Text style={selected.has_ronda_today ? styles.rondaOk : styles.rondaPending}>
                  {selected.has_ronda_today ? ' • RONDA OK' : ' • RONDA PENDENTE'}
                </Text>
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectedBtn}
            onPress={() => openPaddock(selected)}
          >
            <Text style={styles.selectedBtnText}>ABRIR</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Text style={styles.listTitle}>LISTA DE PIQUETES</Text>
        {paddocks.map((p) => {
          const isSel = p.id === selectedId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, isSel && styles.rowSelected]}
              onPress={() => setSelectedId(p.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, isSel && styles.rowNameSelected]}>{p.name}</Text>
                <Text style={styles.rowInfo}>
                  {p.area_hectares.toFixed(1)} ha • {p.total_heads} cab
                </Text>
              </View>
              {isSel && <Text style={styles.rowArrow}>→</Text>}
            </TouchableOpacity>
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
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  modeBtnActive: {
    borderBottomColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  modeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  modeBtnTextActive: { color: Colors.primary },
  modeBtnSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  modeBtnSubActive: { color: Colors.primary, fontWeight: '600' },
  mapWrap: { flex: 0.6, minHeight: 280 },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectedName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  selectedInfo: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  rondaOk: { color: Colors.success, fontWeight: '700' },
  rondaPending: { color: Colors.danger, fontWeight: '700' },
  selectedBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectedBtnText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
  list: { flex: 0.4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  listTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowNameSelected: { color: Colors.primary },
  rowInfo: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowArrow: { fontSize: 20, color: Colors.primary, fontWeight: '800' },
});
