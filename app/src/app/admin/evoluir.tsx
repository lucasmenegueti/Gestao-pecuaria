import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, MultiChoice, BrandHeader, SummaryRow } from '@/components/ui';
import { CATTLE_CATEGORIES, CATEGORY_EVOLUTIONS } from '@/constants';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface Lot {
  category: string;
  head_count: number;
}

interface EvolveDraft {
  count: number;
  destination: string; // só relevante quando CATEGORY_EVOLUTIONS[cat].length > 1
}

export default function EvoluirScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const paddockId = params.paddockId ? Number(params.paddockId) : null;
  const [paddockName, setPaddockName] = useState('');
  const [lots, setLots] = useState<Lot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EvolveDraft>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualFrom, setManualFrom] = useState<string | null>(null);
  const [manualTo, setManualTo] = useState<string | null>(null);
  const [manualCount, setManualCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { load(); }, [paddockId]);

  async function load() {
    if (paddockId == null) return;
    const p = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM paddocks WHERE id = ?',
      [paddockId]
    );
    setPaddockName(p?.name ?? '');
    const rows = await db.getAllAsync<Lot>(
      'SELECT category, head_count FROM herd WHERE paddock_id = ? AND head_count > 0 AND deleted_at IS NULL ORDER BY category',
      [paddockId]
    );
    setLots(rows);
    // Inicializa drafts com destino default = primeira opção de evolução
    const init: Record<string, EvolveDraft> = {};
    for (const l of rows) {
      const opts = CATEGORY_EVOLUTIONS[l.category];
      if (opts && opts.length > 0) {
        init[l.category] = { count: 0, destination: opts[0] };
      }
    }
    setDrafts(init);
  }

  const evolvableLots = lots.filter((l) => CATEGORY_EVOLUTIONS[l.category]?.length);
  const frozenLots = lots.filter((l) => !CATEGORY_EVOLUTIONS[l.category]?.length);

  const selectedEntries = Object.entries(drafts).filter(([, d]) => d.count > 0);
  const selectedTotal = selectedEntries.reduce((s, [, d]) => s + d.count, 0);

  function setDraft(cat: string, patch: Partial<EvolveDraft>) {
    setDrafts((prev) => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));
  }

  async function applyMovement(from: string, to: string, qty: number, notes: string) {
    // decrementa origem
    await db.runAsync(
      'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
      [qty, paddockId, from]
    );
    // upsert destino
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
      [paddockId, to]
    );
    if (existing) {
      await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [qty, existing.id]);
    } else {
      await db.runAsync(
        'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
        [paddockId, to, qty]
      );
    }
    await db.runAsync(
      `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date)
       VALUES (?, 'EVOLUCAO', ?, ?, ?, date('now','localtime'))`,
      [paddockId, from, qty, `${from} → ${to}${notes ? ` · ${notes}` : ''}`]
    );
  }

  async function handleConfirm() {
    if (submittingRef.current || selectedEntries.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      for (const [from, d] of selectedEntries) {
        await applyMovement(from, d.destination, d.count, '');
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao evoluir rebanho.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleManualConfirm() {
    if (submittingRef.current) return;
    if (!manualFrom || !manualTo || manualFrom === manualTo || manualCount <= 0) return;
    const lot = lots.find((l) => l.category === manualFrom);
    if (!lot || lot.head_count < manualCount) {
      Alert.alert('Erro', `Só ${lot?.head_count ?? 0} cab disponível em ${manualFrom}.`);
      return;
    }
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Ajuste manual',
        `Transferir ${manualCount} cab de ${manualFrom} → ${manualTo}. Use apenas pra corrigir erros. Continuar?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmar', onPress: () => resolve(true) },
        ]
      );
    });
    if (!ok) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await applyMovement(manualFrom, manualTo, manualCount, 'ajuste manual');
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha no ajuste.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (paddockId == null) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Evoluir rebanho" context="Rebanho" onBack={() => router.back()} />
        <Text style={styles.empty}>Piquete não informado.</Text>
      </View>
    );
  }

  if (lots.length === 0) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Evoluir rebanho" context={paddockName} onBack={() => router.back()} />
        <Text style={styles.empty}>Piquete sem gado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Evoluir rebanho" context={paddockName} onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {evolvableLots.length > 0 ? (
            <>
              <Text style={styles.label}>LOTES PRA EVOLUIR</Text>
              <Text style={styles.sublabel}>Escolha quantas cabeças avançam pro próximo estágio</Text>
              {evolvableLots.map((l) => {
                const opts = CATEGORY_EVOLUTIONS[l.category]!;
                const draft = drafts[l.category] ?? { count: 0, destination: opts[0] };
                return (
                  <Card key={l.category}>
                    <View style={styles.lotHeader}>
                      <Text style={styles.lotTitle}>{l.category}</Text>
                      <Text style={styles.lotCount}>{l.head_count} cab</Text>
                    </View>
                    {opts.length > 1 ? (
                      <>
                        <Text style={styles.destinoLabel}>DESTINO</Text>
                        <MultiChoice
                          options={opts.map((o) => ({ value: o, label: prettyLabel(o) }))}
                          value={draft.destination}
                          onChange={(v) => v && setDraft(l.category, { destination: v })}
                        />
                      </>
                    ) : (
                      <Text style={styles.arrowText}>→ {prettyLabel(opts[0])}</Text>
                    )}
                    <SliderInput
                      value={draft.count}
                      onValueChange={(v) => setDraft(l.category, { count: v })}
                      min={0}
                      max={l.head_count}
                      step={1}
                      unit="cab"
                    />
                  </Card>
                );
              })}

            </>
          ) : (
            <Card>
              <Text style={styles.noEvolveMsg}>
                Nenhuma categoria aqui tem próximo estágio. BOI e VACA PARIDA são topo do fluxo normal.
              </Text>
            </Card>
          )}

          {frozenLots.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 22 }]}>SEM EVOLUÇÃO AUTOMÁTICA</Text>
              <Card>
                {frozenLots.map((l, i) => (
                  <SummaryRow key={i} label={l.category} value={`${l.head_count} cab`} />
                ))}
                <Text style={styles.sublabel}>
                  Essas categorias são topo do fluxo. Use ajuste manual se precisar corrigir.
                </Text>
              </Card>
            </>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setManualOpen(!manualOpen)}
            style={styles.manualToggle}
          >
            {manualOpen
              ? <ChevronDown size={16} color={NSA.inkMuted} strokeWidth={1.75} />
              : <ChevronRight size={16} color={NSA.inkMuted} strokeWidth={1.75} />}
            <Text style={styles.manualToggleText}>Ajuste manual de categoria</Text>
          </TouchableOpacity>

          {manualOpen && (
            <Card borderColor={NSA.warn}>
              <View style={styles.warnRow}>
                <AlertTriangle size={14} color={NSA.warnFg} strokeWidth={1.75} />
                <Text style={styles.warnText}>
                  Use apenas pra corrigir erros. A evolução natural deve seguir o fluxo acima.
                </Text>
              </View>

              <Text style={styles.manualLabel}>DE (categoria atual)</Text>
              <MultiChoice
                options={lots.map((l) => ({
                  value: l.category,
                  label: l.category,
                  description: `${l.head_count} cab`,
                }))}
                value={manualFrom}
                onChange={(v) => { setManualFrom(v); if (v === manualTo) setManualTo(null); }}
              />

              <Text style={[styles.manualLabel, { marginTop: 14 }]}>PARA (categoria nova)</Text>
              <MultiChoice
                options={CATTLE_CATEGORIES
                  .filter((c) => c.value !== manualFrom)
                  .map((c) => ({ value: c.value, label: c.label }))}
                value={manualTo}
                onChange={setManualTo}
              />

              <Text style={[styles.manualLabel, { marginTop: 14 }]}>QUANTIDADE</Text>
              <SliderInput
                value={manualCount}
                onValueChange={setManualCount}
                min={1}
                max={Math.max(1, lots.find((l) => l.category === manualFrom)?.head_count ?? 1)}
                step={1}
                unit="cab"
              />

              <Button
                title={submitting ? 'Processando…' : 'Aplicar ajuste manual'}
                variant="warning"
                onPress={handleManualConfirm}
                disabled={submitting || !manualFrom || !manualTo || manualCount <= 0}
                style={{ marginTop: 14 }}
              />
            </Card>
          )}
        </ScrollView>

        {evolvableLots.length > 0 && (
          <View style={styles.stickyFooter}>
            <Button
              title={
                selectedTotal === 0
                  ? 'Ajuste as quantidades'
                  : submitting ? 'Processando…' : `Confirmar · ${selectedTotal} cab`
              }
              onPress={handleConfirm}
              disabled={submitting || selectedTotal === 0}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function prettyLabel(cat: string): string {
  return CATTLE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 2,
  },
  sublabel: { fontSize: 12, color: NSA.inkMuted, marginBottom: 12, fontFamily: Fonts.regular },
  empty: { fontSize: 14, color: NSA.inkMuted, textAlign: 'center', marginTop: 60, fontFamily: Fonts.regular, padding: 24 },
  lotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lotTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  lotCount: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkSecondary },
  arrowText: { fontSize: 13, color: NSA.green800, fontFamily: Fonts.medium, marginBottom: 8 },
  destinoLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginTop: 4,
    marginBottom: 6,
  },
  noEvolveMsg: { fontSize: 13, color: NSA.inkSecondary, fontFamily: Fonts.regular, lineHeight: 18 },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    paddingVertical: 10,
  },
  manualToggleText: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.inkMuted },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: NSA.warnBg,
    marginBottom: 14,
  },
  warnText: { flex: 1, fontSize: 12, color: NSA.warnFg, fontFamily: Fonts.medium, lineHeight: 16 },
  manualLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 6,
  },
});
