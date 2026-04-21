import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Settings,
  LogOut,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Stethoscope,
  Zap,
  Beef,
  Package,
  Footprints,
  FlaskConical,
  Truck,
} from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { KPI, ProgressBar, StatusPill, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius, tokensForStatus } from '@/theme/nsa';
import { loadAlerts, AlertsData } from '@/lib/alerts';
import { getSyncStatus } from '@/lib/sync/engine';
import { forceSync, isOnline } from '@/lib/sync/daemon';
import { getActiveRoute, type ActiveRoute } from '@/lib/reabastecimento/active-route';

export default function DashboardScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const offlineMode = useAuthStore((s) => s.offlineMode);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ pending: number; last_sync_at: string | null } | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);

  const refresh = useCallback(() => {
    loadAlerts(db).then(setAlerts).catch(() => setAlerts(null));
    getSyncStatus(db).then(setSyncStatus).catch(() => setSyncStatus(null));
    getActiveRoute(db).then(setActiveRoute).catch(() => setActiveRoute(null));
  }, [db]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleSync() {
    if (syncing) return;
    if (!isOnline()) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para sincronizar com a fazenda.');
      refresh();
      return;
    }
    if (useAuthStore.getState().offlineMode) {
      Alert.alert(
        'Modo offline',
        'Suas credenciais foram validadas sem internet. Faça logout e entre novamente com conexão pra sincronizar.',
      );
      refresh();
      return;
    }
    setSyncing(true);
    try {
      const stats = await forceSync(db);
      if (__DEV__) console.log('[painel] sync', stats);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? 'Erro desconhecido');
      if (__DEV__) console.warn('[painel] sync falhou:', msg);
      Alert.alert(
        'Falha ao sincronizar',
        msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')
          ? 'A conexão caiu no meio. Verifique internet e tente de novo.'
          : msg,
      );
    }
    setSyncing(false);
    refresh();
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const rondasToday = alerts?.rondasToday ?? 0;
  const totalPaddocks = alerts?.paddocksWithCattle ?? 0;
  const progressPct = totalPaddocks > 0 ? (rondasToday / totalPaddocks) * 100 : 0;
  const firstName = user?.name?.split(' ')[0] ?? 'Peão';
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity onPress={() => router.push('/admin')} hitSlop={8} style={styles.iconBtn}>
        <Settings size={20} color={NSA.cream} strokeWidth={1.75} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          useAuthStore.getState().logout();
          router.replace('/(auth)/login');
        }}
        hitSlop={8}
        style={styles.iconBtn}
      >
        <LogOut size={20} color={NSA.cream} strokeWidth={1.75} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <BrandHeader
        title={`${greeting()}, ${firstName}`}
        context={`Painel · ${today}`}
        right={headerActions}
      />

      {/* Sync bar */}
      <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.syncBar} activeOpacity={0.85}>
        <SyncContent syncing={syncing} offlineMode={offlineMode} pending={syncStatus?.pending ?? 0} lastSync={syncStatus?.last_sync_at} />
        <TouchableOpacity onPress={() => router.push('/admin/logs')} hitSlop={8} style={styles.logsBtn}>
          <Text style={styles.logsBtnText}>LOGS</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeRoute && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/reabastecimento/rota?routeId=${activeRoute.id}`)}
            style={styles.routeBanner}
          >
            <View style={styles.routeBannerIcon}>
              <Truck size={18} color={NSA.infoFg} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeBannerTitle}>Rota de reabastecimento em andamento</Text>
              <Text style={styles.routeBannerDetail}>
                {activeRoute.total_remaining} sacos no trator · tocar para continuar
              </Text>
            </View>
            <ChevronRight size={16} color={NSA.infoFg} strokeWidth={1.75} />
          </TouchableOpacity>
        )}

        <KPI
          label="Rondas hoje"
          value={`${rondasToday}`}
          unit={`/ ${totalPaddocks}`}
          hint={totalPaddocks > 0 ? `${Math.round(progressPct)}% do plantel com gado` : 'Sem piquetes com gado'}
          tone={progressPct >= 70 ? 'ok' : progressPct >= 30 ? 'warn' : 'default'}
        />
        <View style={styles.progressWrap}>
          <ProgressBar pct={progressPct} tone={progressPct >= 70 ? 'ok' : progressPct >= 30 ? 'warn' : 'default'} />
        </View>

        {/* Ronda alerts — inclui bombonas em risco (resolve-se por reabastecimento/ronda) */}
        <Section
          title="RONDA"
          Icon={Footprints}
          emptyMsg="Nenhum problema em aberto"
          onHeaderPress={() => router.push('/(tabs)/ronda')}
          items={[
            ...(alerts?.ronda ?? []).map((r) => ({
              kind: severityToKind(r.severity),
              left: r.paddockName,
              right: labelKind(r.kind) + ' · ' + r.detail,
              Icon: iconForKind(r.kind),
              onPress: () => router.push(`/ronda/${r.paddockId}/menu`),
            })),
            ...(alerts?.bombonas ?? []).map((b) => ({
              kind: severityToKind(b.severity),
              left: b.paddockName,
              right:
                b.daysLeft <= 0
                  ? `Cocho previsto vazio · ${b.formulaName}`
                  : `Cocho · ${b.daysLeft} dia(s) · ${b.formulaName}`,
              Icon: Package,
              onPress: () => router.push(`/ronda/${b.paddockId}/menu`),
            })),
          ]}
        />

        {/* Rebanho alerts */}
        <Section
          title="REBANHO"
          Icon={Beef}
          emptyMsg="Todo o gado alocado"
          onHeaderPress={() => router.push('/(tabs)/rebanho')}
          items={
            alerts && alerts.desalocatedTotal > 0
              ? [
                  {
                    kind: 'warn' as const,
                    left: `${alerts.desalocatedTotal} cab desalocadas`,
                    right: alerts.desalocated.map((d) => `${d.heads} ${d.category}`).join(' · '),
                    Icon: Beef,
                    onPress: () => router.push('/admin/alocar'),
                  },
                ]
              : []
          }
        />

        {/* Estoque alerts — bombonas por piquete ficam na Ronda (é onde se resolve) */}
        <Section
          title="ESTOQUE"
          Icon={Package}
          emptyMsg="Sem alertas de suprimento"
          onHeaderPress={() => router.push('/(tabs)/estoque')}
          items={(alerts?.central ?? []).map((c) => ({
            kind: severityToKind(c.severity),
            left: `Central · ${c.formulaName}`,
            right: `${c.have} sacos · ${c.daysLeft} dia(s)`,
            Icon: Package,
            onPress: () => router.push('/(tabs)/estoque'),
          }))}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function SyncContent({
  syncing, offlineMode, pending, lastSync,
}: { syncing: boolean; offlineMode: boolean; pending: number; lastSync: string | null | undefined }) {
  if (syncing) {
    return (
      <View style={styles.syncRow}>
        <ActivityIndicator size="small" color={NSA.warn} />
        <Text style={[styles.syncText, { color: NSA.warnFg }]}>Sincronizando…</Text>
      </View>
    );
  }
  if (offlineMode) {
    return (
      <View style={styles.syncRow}>
        <WifiOff size={14} color={NSA.warnFg} strokeWidth={1.75} />
        <Text style={[styles.syncText, { color: NSA.warnFg }]}>Modo offline · entre online pra sincronizar</Text>
      </View>
    );
  }
  if (!isOnline()) {
    return (
      <View style={styles.syncRow}>
        <WifiOff size={14} color={NSA.dangerFg} strokeWidth={1.75} />
        <Text style={[styles.syncText, { color: NSA.dangerFg }]}>Offline · {pending} pra subir quando reconectar</Text>
      </View>
    );
  }
  if (pending > 0) {
    return (
      <View style={styles.syncRow}>
        <RefreshCw size={14} color={NSA.infoFg} strokeWidth={1.75} />
        <Text style={[styles.syncText, { color: NSA.infoFg }]}>{pending} pra subir · toque pra sincronizar</Text>
      </View>
    );
  }
  return (
    <View style={styles.syncRow}>
      <CheckCircle2 size={14} color={NSA.green800} strokeWidth={1.75} />
      <Text style={[styles.syncText, { color: NSA.okFg }]}>Sincronizado {formatSince(lastSync)}</Text>
    </View>
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

function labelKind(k: 'agua' | 'sanidade' | 'cerca' | 'biologico') {
  if (k === 'agua') return 'Água';
  if (k === 'sanidade') return 'Sanidade';
  if (k === 'biologico') return 'Biológico';
  return 'Cerca';
}

function severityToKind(s: 'warning' | 'danger'): 'warn' | 'danger' {
  return s === 'danger' ? 'danger' : 'warn';
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function iconForKind(k: 'agua' | 'sanidade' | 'cerca' | 'biologico'): LucideIcon {
  if (k === 'agua') return Droplets;
  if (k === 'sanidade') return Stethoscope;
  if (k === 'biologico') return FlaskConical;
  return Zap;
}

interface AlertItem {
  kind: 'warn' | 'danger';
  left: string;
  right: string;
  Icon: LucideIcon;
  onPress?: () => void;
}

function Section({
  title, Icon, items, emptyMsg, onHeaderPress,
}: {
  title: string;
  Icon: LucideIcon;
  items: AlertItem[];
  emptyMsg: string;
  onHeaderPress?: () => void;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity activeOpacity={0.85} onPress={onHeaderPress} disabled={!onHeaderPress} style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon size={14} color={NSA.inkMuted} strokeWidth={1.75} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onHeaderPress && <ChevronRight size={16} color={NSA.inkMuted} strokeWidth={1.75} />}
      </TouchableOpacity>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <StatusPill kind="ok">{emptyMsg}</StatusPill>
        </View>
      ) : (
        items.map((it, i) => {
          const t = tokensForStatus(it.kind);
          return (
            <TouchableOpacity
              key={i}
              onPress={it.onPress}
              disabled={!it.onPress}
              activeOpacity={0.85}
              style={[styles.alertRow, { borderLeftColor: t.edge }]}
            >
              <View style={[styles.alertIcon, { backgroundColor: t.bg }]}>
                <it.Icon size={16} color={t.fg} strokeWidth={1.75} />
              </View>
              <View style={styles.alertBody}>
                <Text style={styles.alertLeft} numberOfLines={1}>{it.left}</Text>
                <Text style={styles.alertRight} numberOfLines={1}>{it.right}</Text>
              </View>
              <ChevronRight size={14} color={NSA.inkMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,227,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  syncText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  logsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
  },
  logsBtnText: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.8,
    color: NSA.inkSecondary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 8 },
  progressWrap: { marginTop: 12 },
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
  },
  empty: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 12,
    alignItems: 'flex-start',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderLeftWidth: 3,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
  },
  alertIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: { flex: 1, minWidth: 0 },
  alertLeft: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
  },
  alertRight: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: NSA.inkSecondary,
    marginTop: 1,
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NSA.infoBg,
    borderWidth: 1,
    borderColor: NSA.info,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 12,
  },
  routeBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.lg,
    backgroundColor: NSA.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBannerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: NSA.infoFg,
    letterSpacing: -0.15,
  },
  routeBannerDetail: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: NSA.inkSecondary,
    marginTop: 2,
  },
});
