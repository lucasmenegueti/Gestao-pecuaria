import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useRondaStore } from '@/stores/rondaStore';
import { BrandHeader, StatusPill } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';
import { FarmMap, PaddockGeo, WaterTank } from '@/components/map';
import type { MapMode } from '@/components/map/types';
import { piquetes, plural } from '@/constants';

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

  const withCattle = paddocks.filter((p) => p.total_heads > 0).length;
  const rondasToday = paddocks.filter((p) => p.total_heads > 0 && p.has_ronda_today).length;

  return (
    <View style={styles.root}>
      <BrandHeader
        title="Mapa"
        context={`${piquetes(paddocks.length)} · ${tanks.length} ${plural(tanks.length, "caixa d'água", "caixas d'água")}`}
      />
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'gado' && styles.modeBtnActive]}
          onPress={() => setMode('gado')}
        >
          <Text style={[styles.modeBtnText, mode === 'gado' && styles.modeBtnTextActive]}>
            Gado
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
            Ronda
          </Text>
          <Text style={[styles.modeBtnSub, mode === 'ronda' && styles.modeBtnSubActive]}>
            {rondasToday} / {withCattle} hoje
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              {mode === 'ronda' && selected.total_heads > 0 && (
                <StatusPill kind={selected.has_ronda_today ? 'ok' : 'danger'} size="sm">
                  {selected.has_ronda_today ? 'Ronda OK' : 'Pendente'}
                </StatusPill>
              )}
              {mode === 'ronda' && selected.total_heads === 0 && selected.has_ronda_today && (
                <StatusPill kind="warn" size="sm">
                  Ronda sem gado
                </StatusPill>
              )}
            </View>
            <Text style={styles.selectedInfo}>
              {selected.area_hectares.toFixed(1)} ha · {selected.total_heads} cab
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectedBtnGhost}
            onPress={() => router.push(`/piquete/${selected.id}/info`)}
          >
            <Text style={styles.selectedBtnGhostText}>Informações</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectedBtn} onPress={() => openPaddock(selected)}>
            <Text style={styles.selectedBtnText}>Abrir</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: NSA.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeBtnActive: {
    borderBottomColor: NSA.green800,
    backgroundColor: NSA.green50,
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: NSA.inkMuted,
  },
  modeBtnTextActive: { color: NSA.green800, fontFamily: Fonts.semibold },
  modeBtnSub: { fontSize: 10, color: NSA.inkMuted, marginTop: 2, fontFamily: Fonts.regular },
  modeBtnSubActive: { color: NSA.green800, fontFamily: Fonts.medium },
  mapWrap: { flex: 0.62, minHeight: 280 },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: NSA.green50,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
    gap: 10,
  },
  selectedName: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  selectedInfo: { fontSize: 12, color: NSA.inkMuted, marginTop: 2, fontFamily: Fonts.regular },
  selectedBtn: {
    backgroundColor: NSA.green800,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.lg,
  },
  selectedBtnText: { color: NSA.cream, fontFamily: Fonts.semibold, fontSize: 13 },
  selectedBtnGhost: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1.5,
    borderColor: NSA.green800,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.lg,
  },
  selectedBtnGhostText: { color: NSA.green800, fontFamily: Fonts.semibold, fontSize: 13 },
  list: { flex: 0.38 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 },
  listTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.xl,
    marginBottom: 6,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
  },
  rowSelected: {
    borderColor: NSA.green800,
    backgroundColor: NSA.green50,
  },
  rowName: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  rowNameSelected: { color: NSA.green800 },
  rowInfo: { fontSize: 11, color: NSA.inkMuted, marginTop: 2, fontFamily: Fonts.regular },
  rowArrow: { fontSize: 18, color: NSA.green800, fontFamily: Fonts.semibold },
});
