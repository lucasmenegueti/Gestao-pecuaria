import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wheat, PackageOpen, Sprout, Droplets, Stethoscope, Zap, Scale, Droplet, FlaskConical } from 'lucide-react-native';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { BrandHeader } from '@/components/ui';
import { NSA, DOMAIN, Fonts, Radius } from '@/theme/nsa';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const EVAL_ITEMS: Array<{
  key: string; label: string; Icon: LucideIcon; domain: keyof typeof DOMAIN; route: string; tableKey: string;
}> = [
  { key: 'suplementacao', label: 'Suplementação', Icon: Wheat, domain: 'suplementacao', route: 'supplement/step1', tableKey: 'supplement_evals' },
  { key: 'bombona', label: 'Bombona', Icon: PackageOpen, domain: 'bombona', route: 'bombona/step1', tableKey: 'bombona_evals' },
  { key: 'forragem', label: 'Forragem', Icon: Sprout, domain: 'forragem', route: 'forage/step1', tableKey: 'forage_evals' },
  { key: 'aguada', label: 'Aguada', Icon: Droplets, domain: 'aguada', route: 'water/step1', tableKey: 'water_evals' },
  { key: 'biologico', label: 'Biológico', Icon: FlaskConical, domain: 'biologico', route: 'biological/step1', tableKey: 'biological_water_evals' },
  { key: 'sanidade', label: 'Sanidade', Icon: Stethoscope, domain: 'sanidade', route: 'health/step1', tableKey: 'health_evals' },
  { key: 'cerca', label: 'Cerca', Icon: Zap, domain: 'cerca', route: 'fence/step1', tableKey: 'fence_evals' },
  { key: 'peso_visual', label: 'Peso visual', Icon: Scale, domain: 'peso', route: 'weight/step1', tableKey: 'visual_weight_evals' },
  { key: 'lavagem', label: 'Lavagem', Icon: Droplet, domain: 'lavagem', route: 'washing/step1', tableKey: 'washing_evals' },
];

export default function EvalMenuScreen() {
  const { paddockId } = useLocalSearchParams<{ paddockId: string }>();
  const store = useRondaStore();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [lastEvals, setLastEvals] = useState<Record<string, string>>({});

  useEffect(() => {
    initRonda();
  }, [user, paddockId]);

  useFocusEffect(
    useCallback(() => {
      loadLastEvals();
    }, [paddockId])
  );

  async function initRonda() {
    if (!user || !paddockId) return;
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM rondas WHERE paddock_id = ? AND user_id = ? AND date = date('now','localtime')",
      [Number(paddockId), user.id]
    );
    if (existing) {
      store.setRondaId(existing.id);
    } else {
      const result = await db.runAsync(
        'INSERT INTO rondas (paddock_id, user_id) VALUES (?, ?)',
        [Number(paddockId), user.id]
      );
      store.setRondaId(result.lastInsertRowId);
    }
  }

  async function loadLastEvals() {
    if (!paddockId) return;
    const pid = Number(paddockId);
    const results: Record<string, string> = {};
    for (const item of EVAL_ITEMS) {
      const row = await db.getFirstAsync<{ created_at: string }>(
        `SELECT e.created_at FROM ${item.tableKey} e JOIN rondas r ON r.id = e.ronda_id WHERE r.paddock_id = ? ORDER BY e.created_at DESC LIMIT 1`,
        [pid]
      );
      if (row) {
        const d = (row.created_at.split('T')[0] ?? row.created_at.split(' ')[0])!;
        const parts = d.split('-');
        if (parts.length === 3) results[item.key] = `${parts[2]}/${parts[1]}`;
      }
    }
    setLastEvals(results);
  }

  const context = [store.currentPaddockHeads ? `${store.currentPaddockHeads} cab` : null, store.currentPaddockArea ? `${store.currentPaddockArea} ha` : null, store.currentGrassTypeName]
    .filter(Boolean).join(' · ');

  return (
    <View style={styles.root}>
      <BrandHeader
        title={store.currentPaddockName || 'Piquete'}
        context={context ? `Ronda · ${context}` : 'Ronda'}
        onBack={() => router.back()}
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>AVALIAR</Text>
          <View style={styles.grid}>
            {EVAL_ITEMS.map((item) => {
              const pal = DOMAIN[item.domain];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.tile}
                  onPress={() => router.push(`/ronda/${paddockId}/${item.route}`)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconWrap, { backgroundColor: pal.tint }]}>
                    <item.Icon size={20} color={pal.dot} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileLabel}>{item.label}</Text>
                    {lastEvals[item.key] ? (
                      <Text style={styles.tileLast}>Últ. {lastEvals[item.key]}</Text>
                    ) : (
                      <Text style={styles.tileLastFaded}>Sem registro</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47.5%',
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xxl,
    padding: 14,
    minHeight: 106,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
    lineHeight: 17,
  },
  tileLast: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: NSA.inkMuted,
    marginTop: 3,
  },
  tileLastFaded: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: NSA.inkDisabled,
    marginTop: 3,
  },
});
