import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { BottomNav } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVAL_ITEMS = [
  { key: 'suplementacao', label: 'SUPLEMENTAÇÃO', icon: '🍶', color: Colors.suplementacao, route: 'supplement/step1' },
  { key: 'bombona', label: 'BOMBONA', icon: '🛢️', color: Colors.bombona, route: 'bombona/step1' },
  { key: 'forragem', label: 'FORRAGEM', icon: '🌿', color: Colors.forragem, route: 'forage/step1' },
  { key: 'aguada', label: 'AGUADA', icon: '💧', color: Colors.aguada, route: 'water/step1' },
  { key: 'sanidade', label: 'SANIDADE', icon: '🩺', color: Colors.sanidade, route: 'health/step1' },
  { key: 'cerca', label: 'CERCA', icon: '⚡', color: Colors.cerca, route: 'fence/step1' },
  { key: 'peso_visual', label: 'PESO VISUAL', icon: '⚖️', color: Colors.peso, route: 'weight/step1' },
  { key: 'lavagem', label: 'LAVAGEM', icon: '🚿', color: Colors.lavagem, route: 'washing/step1' },
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
    const tables: Record<string, string> = {
      suplementacao: 'supplement_evals',
      bombona: 'bombona_evals',
      forragem: 'forage_evals',
      aguada: 'water_evals',
      sanidade: 'health_evals',
      cerca: 'fence_evals',
      peso_visual: 'visual_weight_evals',
      lavagem: 'washing_evals',
    };
    const results: Record<string, string> = {};
    for (const [key, table] of Object.entries(tables)) {
      const row = await db.getFirstAsync<{ created_at: string }>(
        `SELECT e.created_at FROM ${table} e JOIN rondas r ON r.id = e.ronda_id WHERE r.paddock_id = ? ORDER BY e.created_at DESC LIMIT 1`,
        [pid]
      );
      if (row) {
        results[key] = row.created_at.split('T')[0] || row.created_at.split(' ')[0];
      }
    }
    setLastEvals(results);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Menu de Avaliação</Text>
        <Text style={styles.subtitle}>
          {store.currentPaddockName} • {store.currentPaddockHeads} cab • {store.currentPaddockArea} ha • {store.currentGrassTypeName}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {EVAL_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.evalCard, { borderLeftColor: item.color }]}
            onPress={() => router.push(`/ronda/${paddockId}/${item.route}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.evalIcon}>{item.icon}</Text>
            <Text style={styles.evalLabel}>{item.label}</Text>
            {lastEvals[item.key] && (
              <Text style={styles.evalDate}>Últ: {lastEvals[item.key]}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomNav active="Ronda" />
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
  backBtn: { paddingVertical: 8 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  title: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 },
  scroll: { flex: 1 },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  evalCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  evalIcon: { fontSize: 32, marginBottom: 8 },
  evalLabel: { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  evalDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
