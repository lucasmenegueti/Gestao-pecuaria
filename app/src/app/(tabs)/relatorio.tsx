import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Footprints, Beef, Package,
  ArrowRight, TrendingUp, X,
} from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius, tokensForStatus } from '@/theme/nsa';
import { plural } from '@/constants';

interface RondaRow {
  id: number;
  paddock_name: string;
  user_name: string | null;
  completed: number;
  supp: number; bomb: number; forage: number; water: number; biologico: number;
  health: number; fence: number; weight: number; washing: number;
}

interface HerdEventRow {
  id: number;
  event_type: string;
  category: string;
  head_count: number;
  paddock_name: string | null;
  target_paddock_name: string | null;
  notes: string | null;
  weight_kg: number | null;
  created_at: string;
}

interface InventoryEventRow {
  id: number;
  event_type: string;
  formula_name: string;
  paddock_name: string | null;
  sacks_delta: number;
  reason: string | null;
  user_name: string | null;
  created_at: string;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function timeOfDay(iso: string): string {
  // ISO format: "YYYY-MM-DD HH:MM:SS" or similar
  const parts = iso.split(/[ T]/);
  if (parts.length < 2) return '';
  return parts[1].slice(0, 5);
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return isoDate(date);
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const HERD_EVENT_LABELS: Record<string, { label: string; color: 'ok' | 'warn' | 'danger' | 'neutral' }> = {
  ALOCACAO: { label: 'Alocação', color: 'ok' },
  TRANSFERENCIA: { label: 'Transferência', color: 'neutral' },
  NASCIMENTO: { label: 'Nascimento', color: 'ok' },
  MORTE: { label: 'Morte', color: 'danger' },
  VENDA: { label: 'Venda', color: 'warn' },
  COMPRA: { label: 'Compra', color: 'ok' },
  EVOLUCAO: { label: 'Evolução', color: 'ok' },
};

export default function RelatorioScreen() {
  const db = useDatabase();
  const [day, setDay] = useState(() => isoDate(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rondas, setRondas] = useState<RondaRow[]>([]);
  const [herdEvents, setHerdEvents] = useState<HerdEventRow[]>([]);
  const [invEvents, setInvEvents] = useState<InventoryEventRow[]>([]);

  const load = useCallback(async (iso: string) => {
    const rondaRows = await db.getAllAsync<RondaRow>(`
      SELECT r.id, r.completed,
        p.name as paddock_name,
        u.name as user_name,
        (SELECT COUNT(*) FROM supplement_evals WHERE ronda_id = r.id) as supp,
        (SELECT COUNT(*) FROM bombona_evals WHERE ronda_id = r.id) as bomb,
        (SELECT COUNT(*) FROM forage_evals WHERE ronda_id = r.id) as forage,
        (SELECT COUNT(*) FROM water_evals WHERE ronda_id = r.id) as water,
        (SELECT COUNT(*) FROM biological_water_evals WHERE ronda_id = r.id) as biologico,
        (SELECT COUNT(*) FROM health_evals WHERE ronda_id = r.id) as health,
        (SELECT COUNT(*) FROM fence_evals WHERE ronda_id = r.id) as fence,
        (SELECT COUNT(*) FROM visual_weight_evals WHERE ronda_id = r.id) as weight,
        (SELECT COUNT(*) FROM washing_evals WHERE ronda_id = r.id) as washing
      FROM rondas r
      JOIN paddocks p ON p.id = r.paddock_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.date = ?
      ORDER BY p.name
    `, [iso]);
    setRondas(rondaRows);

    const herdRows = await db.getAllAsync<HerdEventRow>(`
      SELECT e.id, e.event_type, e.category, e.head_count, e.notes, e.weight_kg, e.created_at,
        p.name as paddock_name,
        tp.name as target_paddock_name
      FROM herd_events e
      LEFT JOIN paddocks p ON p.id = e.paddock_id
      LEFT JOIN paddocks tp ON tp.id = e.target_paddock_id
      WHERE e.date = ?
      ORDER BY e.created_at
    `, [iso]);
    setHerdEvents(herdRows);

    const invRows = await db.getAllAsync<InventoryEventRow>(`
      SELECT e.id, e.event_type, e.sacks_delta, e.reason, e.created_at,
        f.name as formula_name,
        p.name as paddock_name,
        u.name as user_name
      FROM inventory_events e
      JOIN formulas f ON f.id = e.formula_id
      LEFT JOIN paddocks p ON p.id = e.paddock_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE substr(e.created_at, 1, 10) = ?
      ORDER BY e.created_at
    `, [iso]);
    setInvEvents(invRows);
  }, [db]);

  useFocusEffect(useCallback(() => { load(day); }, [day, load]));

  const today = isoDate(new Date());
  const isToday = day === today;

  const rondaSections = (r: RondaRow) => {
    const items: Array<{ key: string; label: string }> = [];
    if (r.supp) items.push({ key: 'supp', label: 'Suplementação' });
    if (r.bomb) items.push({ key: 'bomb', label: 'Bombona' });
    if (r.forage) items.push({ key: 'forage', label: 'Forragem' });
    if (r.water) items.push({ key: 'water', label: 'Aguada' });
    if (r.biologico) items.push({ key: 'biologico', label: 'Biológico' });
    if (r.health) items.push({ key: 'health', label: 'Sanidade' });
    if (r.fence) items.push({ key: 'fence', label: 'Cerca' });
    if (r.weight) items.push({ key: 'weight', label: 'Peso visual' });
    if (r.washing) items.push({ key: 'washing', label: 'Lavagem' });
    return items;
  };

  return (
    <View style={styles.root}>
      <BrandHeader title="Relatório diário" context={isToday ? 'Hoje' : humanDate(day)} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={styles.dateBar}>
          <TouchableOpacity onPress={() => setDay(shiftDay(day, -1))} hitSlop={10} style={styles.dateBtn}>
            <ChevronLeft size={18} color={NSA.inkPrimary} strokeWidth={1.75} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPickerOpen(true)}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text style={styles.dateLabel}>{humanDate(day)}</Text>
            {!isToday ? (
              <TouchableOpacity onPress={() => setDay(today)} activeOpacity={0.85}>
                <Text style={styles.todayLink}>Voltar pra hoje</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.pickHint}>Tocar pra escolher data</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDay(shiftDay(day, 1))}
            hitSlop={10}
            style={styles.dateBtn}
            disabled={day >= today}
          >
            <ChevronRight size={18} color={day >= today ? NSA.inkDisabled : NSA.inkPrimary} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>

        <CalendarModal
          visible={pickerOpen}
          selected={day}
          maxDay={today}
          onPick={(iso) => { setDay(iso); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* RONDA */}
          <SectionHeader title="Ronda" Icon={Footprints} count={rondas.length} />
          {rondas.length === 0 ? (
            <EmptyRow text="Nenhuma ronda no dia" />
          ) : (
            rondas.map((r) => {
              const items = rondaSections(r);
              return (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => router.push(`/ronda/${r.id}/menu` as any)}
                  disabled
                >
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{r.paddock_name}</Text>
                    <Text style={styles.cardMeta}>{items.length} {items.length === 1 ? 'seção' : 'seções'}</Text>
                  </View>
                  {r.user_name && <Text style={styles.cardSub}>por {r.user_name}</Text>}
                  <Text style={styles.cardDetail}>{items.map((i) => i.label).join(' · ') || 'Sem avaliações'}</Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* REBANHO */}
          <SectionHeader title="Rebanho" Icon={Beef} count={herdEvents.length} />
          {herdEvents.length === 0 ? (
            <EmptyRow text="Nenhum evento de rebanho no dia" />
          ) : (
            herdEvents.map((e) => {
              const meta = HERD_EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: 'neutral' as const };
              const tokens = tokensForStatus(meta.color as any);
              const locationText =
                e.event_type === 'TRANSFERENCIA'
                  ? `${e.paddock_name ?? 'pool'} → ${e.target_paddock_name ?? 'pool'}`
                  : e.paddock_name ?? 'Desalocado';
              return (
                <View key={e.id} style={[styles.card, { borderLeftColor: tokens.edge, borderLeftWidth: 3 }]}>
                  <View style={styles.cardHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardTitle}>{meta.label}</Text>
                      {e.event_type === 'TRANSFERENCIA' && <ArrowRight size={14} color={NSA.inkMuted} />}
                      {e.event_type === 'EVOLUCAO' && <TrendingUp size={14} color={NSA.inkMuted} />}
                    </View>
                    <Text style={styles.cardMeta}>{e.head_count} cab · {timeOfDay(e.created_at)}</Text>
                  </View>
                  <Text style={styles.cardSub}>
                    {e.category} · {locationText}
                  </Text>
                  {e.weight_kg != null && (
                    <Text style={styles.cardDetail}>Peso médio: {e.weight_kg} kg</Text>
                  )}
                  {e.notes && <Text style={styles.cardDetail}>{e.notes}</Text>}
                </View>
              );
            })
          )}

          {/* ESTOQUE */}
          <SectionHeader title="Estoque" Icon={Package} count={invEvents.length} />
          {invEvents.length === 0 ? (
            <EmptyRow text="Nenhuma movimentação de estoque no dia" />
          ) : (
            invEvents.map((e) => {
              const isIn = e.sacks_delta >= 0;
              const tokens = tokensForStatus(isIn ? 'ok' : 'warn');
              return (
                <View key={e.id} style={[styles.card, { borderLeftColor: tokens.edge, borderLeftWidth: 3 }]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{e.event_type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}</Text>
                    <Text style={styles.cardMeta}>{isIn ? '+' : ''}{e.sacks_delta} {plural(e.sacks_delta, 'saco', 'sacos')} · {timeOfDay(e.created_at)}</Text>
                  </View>
                  <Text style={styles.cardSub}>
                    {e.formula_name}{e.paddock_name ? ` · ${e.paddock_name}` : ' · Central'}
                  </Text>
                  {e.reason && <Text style={styles.cardDetail}>{e.reason}</Text>}
                  {e.user_name && <Text style={styles.cardDetail}>por {e.user_name}</Text>}
                </View>
              );
            })
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function CalendarModal({
  visible, selected, maxDay, onPick, onClose,
}: {
  visible: boolean;
  selected: string;
  maxDay: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const [y, m] = selected.split('-').map(Number);
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m - 1);

  // Quando o modal reabre com uma data diferente, realinha o mês exibido.
  React.useEffect(() => {
    if (visible) {
      const [sy, sm] = selected.split('-').map(Number);
      setViewYear(sy);
      setViewMonth(sm - 1);
    }
  }, [visible, selected]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = first.getDay(); // 0 = dom
    const arr: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < leading; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ iso: isoDate(new Date(viewYear, viewMonth, d)), day: d });
    }
    return arr;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHead}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.calNavBtn}>
              <ChevronLeft size={18} color={NSA.inkPrimary} strokeWidth={1.75} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{MONTH_LABELS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} style={styles.calNavBtn}>
              <ChevronRight size={18} color={NSA.inkPrimary} strokeWidth={1.75} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.calCloseBtn}>
              <X size={16} color={NSA.inkMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (!c) return <View key={`e-${i}`} style={styles.cell} />;
              const isSel = c.iso === selected;
              const isFuture = c.iso > maxDay;
              const isToday = c.iso === maxDay;
              return (
                <TouchableOpacity
                  key={c.iso}
                  activeOpacity={0.85}
                  disabled={isFuture}
                  onPress={() => onPick(c.iso)}
                  style={[
                    styles.cell,
                    isSel && styles.cellSelected,
                    !isSel && isToday && styles.cellToday,
                  ]}
                >
                  <Text style={[
                    styles.cellText,
                    isFuture && styles.cellTextFuture,
                    isSel && styles.cellTextSelected,
                    !isSel && isToday && styles.cellTextToday,
                  ]}>
                    {c.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => onPick(maxDay)}
            activeOpacity={0.85}
            style={styles.todayBtn}
          >
            <Text style={styles.todayBtnText}>Hoje</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function SectionHeader({ title, Icon, count }: { title: string; Icon: LucideIcon; count: number }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color={NSA.inkMuted} strokeWidth={1.75} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: NSA.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15, textTransform: 'capitalize' },
  todayLink: { fontSize: 11, color: NSA.green800, fontFamily: Fonts.medium, marginTop: 2 },
  pickHint: { fontSize: 11, color: NSA.inkMuted, fontFamily: Fonts.regular, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 22, 9, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: NSA.bgElevated,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: NSA.border,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
    textAlign: 'center',
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: NSA.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: NSA.inkMuted,
    fontFamily: Fonts.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: NSA.green800,
    borderRadius: Radius.md,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: NSA.green800,
    borderRadius: Radius.md,
  },
  cellText: { fontSize: 13, color: NSA.inkPrimary, fontFamily: Fonts.regular },
  cellTextFuture: { color: NSA.inkDisabled },
  cellTextSelected: { color: NSA.cream, fontFamily: Fonts.semibold },
  cellTextToday: { color: NSA.green800, fontFamily: Fonts.semibold },
  todayBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    alignItems: 'center',
  },
  todayBtnText: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    color: NSA.inkMuted,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: NSA.inkSecondary,
  },
  card: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  cardMeta: { fontSize: 12, fontFamily: Fonts.regular, color: NSA.inkMuted },
  cardSub: { fontSize: 13, fontFamily: Fonts.regular, color: NSA.inkSecondary, marginTop: 4 },
  cardDetail: { fontSize: 12, fontFamily: Fonts.regular, color: NSA.inkMuted, marginTop: 2 },
  empty: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 14,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: NSA.inkMuted, fontFamily: Fonts.regular },
});
