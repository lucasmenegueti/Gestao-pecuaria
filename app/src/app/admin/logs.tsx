import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { fetchLogs, clearLogs, LogEntry } from '@/lib/log';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const LEVEL_COLOR = { info: Colors.primary, warn: Colors.warning, error: Colors.danger } as const;

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const reload = useCallback(async () => {
    const data = await fetchLogs(300);
    setLogs(data);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function handleClear() {
    Alert.alert('Limpar logs?', 'Remove todos os registros de atividade.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: async () => { await clearLogs(); reload(); } },
    ]);
  }

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log de Atividade</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'info', 'warn', 'error'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearText}>LIMPAR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {filtered.length === 0 && (
          <Text style={styles.empty}>Sem registros.</Text>
        )}
        {filtered.map((l) => (
          <View key={l.id} style={styles.entry}>
            <View style={styles.entryHeader}>
              <Text style={[styles.level, { color: LEVEL_COLOR[l.level] }]}>
                {l.level.toUpperCase()}
              </Text>
              <Text style={styles.category}>{l.category}</Text>
              <Text style={styles.ts}>{l.ts.slice(5, 19)}</Text>
            </View>
            <Text style={styles.action}>{l.action}</Text>
            {l.data && (
              <Text style={styles.data} numberOfLines={6}>{l.data}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { color: Colors.primary },
  clearBtn: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  scroll: { flex: 1 },
  entry: {
    backgroundColor: Colors.white,
    marginHorizontal: 10,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  level: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  ts: { fontSize: 10, color: Colors.textMuted, marginLeft: 'auto' },
  action: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 4 },
  data: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontFamily: 'Courier' },
  empty: { textAlign: 'center', padding: 40, color: Colors.textMuted },
});
