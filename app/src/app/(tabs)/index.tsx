import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardTitle } from '@/components/ui';
import { Colors } from '@/constants';
import { loadAlerts, AlertsData } from '@/lib/alerts';
import { getSyncStatus } from '@/lib/sync/engine';
import { forceSync, isOnline } from '@/lib/sync/daemon';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTION_COLOR = {
  ronda: Colors.suplementacao, // reusa cor da ronda
  rebanho: Colors.rebanho,
  estoque: Colors.peso,
} as const;

export default function DashboardScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const offlineMode = useAuthStore((s) => s.offlineMode);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ pending: number; last_pull_at: string | null } | null>(null);

  const refresh = useCallback(() => {
    loadAlerts(db).then(setAlerts).catch(() => setAlerts(null));
    getSyncStatus(db).then(setSyncStatus).catch(() => setSyncStatus(null));
  }, [db]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const stats = await forceSync(db);
      if (__DEV__) console.log('[painel] sync', stats);
    } catch (e: any) {
      if (__DEV__) console.warn('[painel] sync falhou:', e?.message);
    }
    setSyncing(false);
    refresh();
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'BOM DIA';
    if (h < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  };

  const rondasToday = alerts?.rondasToday ?? 0;
  const totalPaddocks = alerts?.paddocksWithCattle ?? 0;
  const progress = totalPaddocks > 0 ? (rondasToday / totalPaddocks) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Painel</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/admin/formulas')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              useAuthStore.getState().logout();
              router.replace('/(auth)/login');
            }}
            hitSlop={8}
          >
            <Text style={styles.logoutText}>SAIR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.syncBar}>
        <TouchableOpacity onPress={handleSync} disabled={syncing} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
          {syncing ? (
            <>
              <ActivityIndicator size="small" color={Colors.warning} />
              <Text style={[styles.syncText, { marginLeft: 8 }]}>Sincronizando…</Text>
            </>
          ) : offlineMode ? (
            <Text style={[styles.syncText, { color: Colors.warning }]}>
              ⚠ Modo offline · entre online pra sincronizar
            </Text>
          ) : !isOnline() ? (
            <Text style={[styles.syncText, { color: Colors.danger }]}>
              📵 Offline · {syncStatus?.pending ?? 0} pra subir quando reconectar
            </Text>
          ) : (syncStatus?.pending ?? 0) > 0 ? (
            <Text style={styles.syncText}>
              🔄 {syncStatus?.pending} pra subir · toque pra sincronizar
            </Text>
          ) : (
            <Text style={[styles.syncText, { color: Colors.success }]}>
              ✓ Sincronizado {formatSince(syncStatus?.last_pull_at)}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/admin/logs')} hitSlop={8} style={styles.logsBtn}>
          <Text style={styles.logsBtnText}>LOGS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>
          {greeting()}, {user?.name?.split(' ')[0]?.toUpperCase() || 'PEÃO'}!
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* Progress de ronda — principal indicador diário */}
        <Card style={{ marginTop: 16 }}>
          <CardTitle>Rondas feitas hoje</CardTitle>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{rondasToday} de {totalPaddocks}</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </Card>

        {/* Ronda alerts */}
        <AlertSection
          title="RONDA"
          color={SECTION_COLOR.ronda}
          emptyMsg="Nenhum problema em aberto"
          onHeaderPress={() => router.push('/(tabs)/ronda')}
          items={(alerts?.ronda ?? []).map((r) => ({
            severity: r.severity,
            left: r.paddockName,
            right: labelKind(r.kind) + ' · ' + r.detail,
            onPress: () => router.push(`/ronda/${r.paddockId}/menu`),
          }))}
        />

        {/* Rebanho alerts */}
        <AlertSection
          title="REBANHO"
          color={SECTION_COLOR.rebanho}
          emptyMsg="Todo o gado alocado"
          onHeaderPress={() => router.push('/(tabs)/rebanho')}
          items={
            alerts && alerts.desalocatedTotal > 0
              ? [
                  {
                    severity: 'warning' as const,
                    left: `${alerts.desalocatedTotal} cab desalocadas`,
                    right: alerts.desalocated.map((d) => `${d.heads} ${d.category}`).join(' · '),
                    onPress: () => router.push('/admin/alocar'),
                  },
                ]
              : []
          }
        />

        {/* Estoque alerts */}
        <AlertSection
          title="ESTOQUE"
          color={SECTION_COLOR.estoque}
          emptyMsg="Sem alertas de suprimento"
          onHeaderPress={() => router.push('/(tabs)/estoque')}
          items={[
            ...(alerts?.bombonas ?? []).map((b) => ({
              severity: b.severity,
              left: b.paddockName,
              right:
                b.daysLeft <= 0
                  ? `Cocho previsto vazio · ${b.formulaName}`
                  : `${b.daysLeft} dia(s) · ${b.formulaName}`,
              onPress: () => router.push(`/ronda/${b.paddockId}/menu`),
            })),
            ...(alerts?.central ?? []).map((c) => ({
              severity: c.severity,
              left: 'Central: ' + c.formulaName,
              right: `${c.have} sacos · ${c.daysLeft} dia(s) (precisa ${c.need} p/ 30d)`,
              onPress: () => router.push('/(tabs)/estoque'),
            })),
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSince(iso: string | null | undefined): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function labelKind(k: 'agua' | 'sanidade' | 'cerca') {
  if (k === 'agua') return '💧 Água';
  if (k === 'sanidade') return '🩺 Sanidade';
  return '🧱 Cerca';
}

interface AlertItem {
  severity: 'warning' | 'danger';
  left: string;
  right: string;
  onPress?: () => void;
}

function AlertSection({
  title, color, items, emptyMsg, onHeaderPress,
}: {
  title: string;
  color: string;
  items: AlertItem[];
  emptyMsg: string;
  onHeaderPress?: () => void;
}) {
  return (
    <View style={[sectionStyles.card, { borderLeftColor: color }]}>
      <TouchableOpacity onPress={onHeaderPress} disabled={!onHeaderPress} style={sectionStyles.header}>
        <Text style={[sectionStyles.title, { color }]}>{title}</Text>
        {onHeaderPress && <Text style={sectionStyles.chev}>›</Text>}
      </TouchableOpacity>
      {items.length === 0 ? (
        <Text style={sectionStyles.empty}>✓ {emptyMsg}</Text>
      ) : (
        items.map((it, i) => (
          <TouchableOpacity
            key={i}
            onPress={it.onPress}
            disabled={!it.onPress}
            style={[
              sectionStyles.row,
              { borderLeftColor: it.severity === 'danger' ? Colors.danger : Colors.warning },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={sectionStyles.rowLeft}>{it.left}</Text>
              <Text style={sectionStyles.rowRight}>{it.right}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  chev: { fontSize: 20, color: Colors.textMuted, fontWeight: '700' },
  empty: { fontSize: 13, color: Colors.success, marginTop: 8, fontWeight: '600' },
  row: {
    marginTop: 8,
    paddingLeft: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
  },
  rowLeft: { fontSize: 14, fontWeight: '700', color: Colors.text },
  rowRight: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  settingsIcon: { fontSize: 24 },
  logoutText: { color: Colors.white, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  syncBar: {
    backgroundColor: '#fff3e0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
  logsBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: Colors.textMuted },
  logsBtnText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: '800', color: Colors.text },
  date: { fontSize: 16, color: Colors.textMuted, marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  progressPercent: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
});
