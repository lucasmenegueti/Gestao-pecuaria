import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wheat, PackageOpen, Sprout, Droplets, Stethoscope, Zap, Scale, Droplet, FlaskConical } from 'lucide-react-native';
import { useRondaStore } from '@/stores/rondaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDatabase } from '@/lib/db/provider';
import { BrandHeader } from '@/components/ui';
import { NSA, DOMAIN, Fonts, Radius } from '@/theme/nsa';
import { confirm } from '@/lib/confirm';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface EvalItem {
  key: string;
  /** Mapeia 1:1 com inspection_requests.eval_kind. Mesmo valor de `key` por enquanto. */
  evalKind: string;
  label: string;
  Icon: LucideIcon;
  domain: keyof typeof DOMAIN;
  route: string;
  tableKey: string;
  category: 'obrigatorio' | 'sob_demanda';
}

const EVAL_ITEMS: EvalItem[] = [
  { key: 'suplementacao', evalKind: 'suplementacao', label: 'Suplementação', Icon: Wheat, domain: 'suplementacao', route: 'supplement/step1', tableKey: 'supplement_evals', category: 'obrigatorio' },
  { key: 'aguada', evalKind: 'aguada', label: 'Aguada', Icon: Droplets, domain: 'aguada', route: 'water/step1', tableKey: 'water_evals', category: 'obrigatorio' },
  { key: 'cerca', evalKind: 'cerca', label: 'Cerca', Icon: Zap, domain: 'cerca', route: 'fence/step1', tableKey: 'fence_evals', category: 'obrigatorio' },
  { key: 'bombona', evalKind: 'bombona', label: 'Bombona', Icon: PackageOpen, domain: 'bombona', route: 'bombona/step1', tableKey: 'bombona_evals', category: 'sob_demanda' },
  { key: 'forragem', evalKind: 'forragem', label: 'Forragem', Icon: Sprout, domain: 'forragem', route: 'forage/step1', tableKey: 'forage_evals', category: 'sob_demanda' },
  { key: 'biologico', evalKind: 'biologico', label: 'Biológico', Icon: FlaskConical, domain: 'biologico', route: 'biological/step1', tableKey: 'biological_water_evals', category: 'sob_demanda' },
  { key: 'sanidade', evalKind: 'sanidade', label: 'Sanidade', Icon: Stethoscope, domain: 'sanidade', route: 'health/step1', tableKey: 'health_evals', category: 'sob_demanda' },
  { key: 'peso_visual', evalKind: 'peso_visual', label: 'Peso visual', Icon: Scale, domain: 'peso', route: 'weight/step1', tableKey: 'visual_weight_evals', category: 'sob_demanda' },
  { key: 'lavagem', evalKind: 'lavagem', label: 'Lavagem', Icon: Droplet, domain: 'lavagem', route: 'washing/step1', tableKey: 'washing_evals', category: 'sob_demanda' },
];

const OBRIGATORIOS = EVAL_ITEMS.filter((i) => i.category === 'obrigatorio');
const SOB_DEMANDA = EVAL_ITEMS.filter((i) => i.category === 'sob_demanda');

export default function EvalMenuScreen() {
  const { paddockId } = useLocalSearchParams<{ paddockId: string }>();
  const store = useRondaStore();
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [lastEvals, setLastEvals] = useState<Record<string, string>>({});
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  // Guard contra disparos paralelos de initRonda. Sem isso, dois renders rápidos
  // (ex: hidratação tardia do authStore + paddockId mudando) faziam SELECT/SELECT
  // antes de qualquer INSERT commitar → INSERT/INSERT → 2+ rondas no mesmo dia.
  // Vimos isso em produção: 6 rondas no P75 num único dia (2026-04-29, Rafael).
  const initRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!user?.id || !paddockId) return;
    if (initRef.current) return;
    initRef.current = initRonda().finally(() => { initRef.current = null; });
    hydratePaddock();
    // user.id (string estável) em vez de user (objeto novo a cada hidratação)
    // evita re-runs espúrios. eslint-disable: hydratePaddock só depende de paddockId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, paddockId]);

  useFocusEffect(
    useCallback(() => {
      loadLastEvals();
      loadPendingRequests();
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

  // Hidrata dados do piquete no rondaStore sempre que a menu é aberta.
  // Sem isso, entrar direto via URL (sem passar pelo tab ronda/mapa) deixa
  // `currentPaddockName`/`currentGrassTypeName`/`currentPaddockHeads` nulos,
  // o que vaza como "null" nos headers dos wizards/summaries.
  async function hydratePaddock() {
    if (!paddockId) return;
    const pid = Number(paddockId);
    const row = await db.getFirstAsync<{
      id: number; name: string; area_hectares: number;
      grass_name: string; total_heads: number | null;
    }>(
      `SELECT p.id, p.name, p.area_hectares, gt.name as grass_name,
        (SELECT COALESCE(SUM(h.head_count), 0) FROM herd h
          WHERE h.paddock_id = p.id AND h.head_count > 0) as total_heads
       FROM paddocks p
       JOIN grass_types gt ON gt.id = p.grass_type_id
       WHERE p.id = ?`,
      [pid]
    );
    if (row) {
      store.setCurrentPaddock(row.id, row.name, row.total_heads ?? 0, row.area_hectares, row.grass_name);
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
        // created_at pode ser ISO ("2026-04-26T22:54:05Z") ou SQLite local ("2026-04-26 22:54:05").
        // Split em /[T ]/ pega só a data em qualquer formato. O `??` anterior falhava porque
        // split('T') sempre retorna array não-null, nunca caindo no fallback de espaço.
        const d = row.created_at.split(/[T ]/)[0]!;
        const parts = d.split('-');
        if (parts.length === 3) results[item.key] = `${parts[2]}/${parts[1]}`;
      }
    }
    setLastEvals(results);
  }

  async function loadPendingRequests() {
    if (!paddockId) return;
    const rows = await db.getAllAsync<{ eval_kind: string }>(
      `SELECT eval_kind FROM inspection_requests
       WHERE paddock_id = ? AND status = 'pending' AND deleted_at IS NULL`,
      [Number(paddockId)]
    );
    setPendingRequests(new Set(rows.map((r) => r.eval_kind)));
  }

  // Abre a seção do wizard, mas se já existir avaliação do mesmo tipo na ronda
  // do dia, pede confirmação antes — evita o caso "peão apertou Finalizar 2x"
  // sem bloquear o caso legítimo "voltei à tarde e reabasteci de novo".
  async function openSection(item: EvalItem) {
    const target = `/ronda/${paddockId}/${item.route}`;
    const rondaId = store.currentRondaId;
    if (!rondaId) {
      router.push(target);
      return;
    }
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${item.tableKey} WHERE ronda_id = ? AND deleted_at IS NULL`,
      [rondaId]
    );
    if ((row?.count ?? 0) === 0) {
      router.push(target);
      return;
    }
    const ok = await confirm({
      title: `${item.label} já avaliada hoje`,
      message: 'Você já registrou esta seção neste piquete hoje. Quer fazer uma nova avaliação? A anterior fica preservada no histórico.',
      confirmLabel: 'Fazer nova',
      cancelLabel: 'Cancelar',
    });
    if (ok) router.push(target);
  }

  const context = [store.currentPaddockHeads ? `${store.currentPaddockHeads} cab` : null, store.currentPaddockArea ? `${store.currentPaddockArea} ha` : null, store.currentGrassTypeName]
    .filter(Boolean).join(' · ');

  return (
    <View style={styles.root}>
      <BrandHeader
        title={store.currentPaddockName || 'Piquete'}
        context={context ? `Ronda · ${context}` : 'Ronda'}
        onBack={() => router.replace('/(tabs)/ronda')}
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Section
            label="OBRIGATÓRIOS"
            items={OBRIGATORIOS}
            lastEvals={lastEvals}
            pendingRequests={pendingRequests}
            onOpen={openSection}
          />
          <Section
            label="SOB DEMANDA"
            items={SOB_DEMANDA}
            lastEvals={lastEvals}
            pendingRequests={pendingRequests}
            onOpen={openSection}
            style={styles.sectionSpacing}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({
  label, items, lastEvals, pendingRequests, onOpen, style,
}: {
  label: string;
  items: EvalItem[];
  lastEvals: Record<string, string>;
  pendingRequests: Set<string>;
  onOpen: (item: EvalItem) => void;
  style?: any;
}) {
  return (
    <View style={style}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.grid}>
        {items.map((item) => {
          const pal = DOMAIN[item.domain];
          const requested = pendingRequests.has(item.evalKind);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tile, requested && styles.tileRequested]}
              onPress={() => onOpen(item)}
              activeOpacity={0.85}
            >
              <View style={styles.tileHead}>
                <View style={[styles.iconWrap, { backgroundColor: pal.tint }]}>
                  <item.Icon size={20} color={pal.dot} strokeWidth={1.75} />
                </View>
                {requested && (
                  <View style={styles.requestedBadge}>
                    <Text style={styles.requestedBadgeText}>SOLICITADO</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileLabel}>{item.label}</Text>
                {requested ? (
                  <Text style={styles.tileRequestedHint}>Pedido pelo admin</Text>
                ) : lastEvals[item.key] ? (
                  <Text style={styles.tileLast}>Últ. {lastEvals[item.key]}</Text>
                ) : (
                  <Text style={styles.tileLastFaded}>Sem registro</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
  sectionSpacing: { marginTop: 22 },
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
  tileRequested: {
    borderColor: NSA.warn,
    borderWidth: 1.5,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestedBadge: {
    backgroundColor: NSA.warn,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  requestedBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.6,
    color: NSA.warnFg,
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
  tileRequestedHint: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: NSA.warnFg,
    marginTop: 3,
  },
});
