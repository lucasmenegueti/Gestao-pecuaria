import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption {
  id: number;
  name: string;
}

interface CategoryRow {
  category: string;
  head_count: number;
}

export default function DesalocarScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(params.paddockId ?? null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Guard bulletproof contra double-tap — state do React é async e não segura taps rápidos.
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name
      FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0 AND h.deleted_at IS NULL
      ORDER BY p.name
    `).then(setPaddocks);
  }, []);

  useEffect(() => {
    if (!paddockId) {
      setCategories([]);
      setAmounts({});
      return;
    }
    db.getAllAsync<CategoryRow>(
      'SELECT category, head_count FROM herd WHERE paddock_id = ? AND head_count > 0 AND deleted_at IS NULL ORDER BY category',
      [Number(paddockId)]
    ).then((rows) => {
      setCategories(rows);
      setAmounts(Object.fromEntries(rows.map((r) => [r.category, 0])));
    });
  }, [paddockId]);

  function setAmount(cat: string, v: number) {
    setAmounts((prev) => ({ ...prev, [cat]: v }));
  }

  function fillAll() {
    setAmounts(Object.fromEntries(categories.map((c) => [c.category, c.head_count])));
  }

  function clearAll() {
    setAmounts(Object.fromEntries(categories.map((c) => [c.category, 0])));
  }

  function goToReview() {
    const entries = Object.entries(amounts).filter(([, v]) => v > 0);
    if (!paddockId || entries.length === 0) {
      Alert.alert('Erro', 'Selecione ao menos uma categoria com quantidade > 0.');
      return;
    }
    setReviewing(true);
  }

  async function handleConfirm() {
    const entries = Object.entries(amounts).filter(([, v]) => v > 0);
    if (__DEV__) console.log('[desalocar] handleConfirm start', { paddockId, entries });
    if (!paddockId || entries.length === 0) {
      if (__DEV__) console.warn('[desalocar] abort: no paddock or entries');
      return;
    }
    if (submittingRef.current) {
      if (__DEV__) console.warn('[desalocar] handleConfirm já em andamento — ignorando double-tap');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Tudo numa transação: se qualquer categoria falhar, reverte o que já rodou
      // (não deixa piquete com 2 categorias desalocadas + 3ª que não completou).
      await db.withTransactionAsync(async () => {
        for (const [cat, qty] of entries) {
          const row = await db.getFirstAsync<{ head_count: number }>(
            'SELECT head_count FROM herd WHERE paddock_id = ? AND category = ?',
            [Number(paddockId), cat]
          );
          const available = row?.head_count ?? 0;
          if (qty > available) {
            throw new Error(`${cat}: disponível ${available}, tentou desalocar ${qty}.`);
          }
          await db.runAsync(
            'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
            [qty, Number(paddockId), cat]
          );
          const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM herd WHERE paddock_id IS NULL AND category = ?',
            [cat]
          );
          if (existing) {
            await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [qty, existing.id]);
          } else {
            await db.runAsync(
              'INSERT INTO herd (paddock_id, category, head_count) VALUES (NULL, ?, ?)',
              [cat, qty]
            );
          }
          await db.runAsync(
            'INSERT INTO herd_events (paddock_id, event_type, category, head_count, date) VALUES (?, ?, ?, ?, date(\'now\',\'localtime\'))',
            [Number(paddockId), 'DESALOCACAO', cat, qty]
          );
        }
      });
      // NÃO deletar rows com head_count=0 — a coluna supabase_id precisa ser preservada
      // pra sync fazer UPDATE, não INSERT (que daria UNIQUE violation e duplicar via heal).
      // UI já filtra head_count > 0 nas telas de exibição.
      if (__DEV__) console.log('[desalocar] success, navigating back');
      submittingRef.current = false;
      setSubmitting(false);
      setReviewing(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/rebanho');
      }
    } catch (err) {
      if (__DEV__) console.error('[desalocar] falha', err);
      submittingRef.current = false;
      setSubmitting(false);
      Alert.alert('Erro', String((err as Error)?.message ?? 'Falha ao desalocar.'));
    }
  }

  const selectedTotal = Object.values(amounts).reduce((s, v) => s + v, 0);
  const selectedEntries = Object.entries(amounts).filter(([, v]) => v > 0);
  const paddockName = paddocks.find((p) => String(p.id) === paddockId)?.name ?? '';

  if (reviewing) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Confirmar desalocação" context="Rebanho" onBack={() => setReviewing(false)} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Card borderColor={NSA.warn}>
              <SummaryRow label="Piquete" value={paddockName} />
              {selectedEntries.map(([cat, qty]) => (
                <SummaryRow key={cat} label={cat} value={`${qty} cab`} />
              ))}
              <SummaryRow label="Total" value={`${selectedTotal} cab`} valueColor={NSA.warnFg} />
              <Text style={styles.reviewNote}>
                Essas cabeças sairão do piquete e ficarão na pool de desalocados, prontas para
                formar novos lotes.
              </Text>
            </Card>
          </ScrollView>

          <View style={styles.stickyFooter}>
            <Button
              title={submitting ? 'Processando…' : 'Confirmar'}
              onPress={handleConfirm}
              disabled={submitting}
            />
            <Button
              title="Voltar e ajustar"
              variant="outline"
              onPress={() => setReviewing(false)}
              disabled={submitting}
              style={{ marginTop: 10 }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Desalocar lote" context="Rebanho" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {!params.paddockId && (
            <>
              <Text style={styles.label}>PIQUETE DE ORIGEM</Text>
              <MultiChoice
                options={paddocks.map((p) => ({ value: String(p.id), label: p.name }))}
                value={paddockId}
                onChange={setPaddockId}
              />
            </>
          )}
          {params.paddockId && paddockName && (
            <View style={styles.piqueteHeader}>
              <Text style={styles.piqueteLabel}>PIQUETE</Text>
              <Text style={styles.piqueteValue}>{paddockName}</Text>
            </View>
          )}

          {paddockId && categories.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE POR CATEGORIA</Text>
              <Text style={styles.sublabel}>
                {categories.reduce((s, c) => s + c.head_count, 0)} cab disponíveis no piquete
              </Text>

              <View style={styles.bulkRow}>
                <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnPrimary]} onPress={fillAll} activeOpacity={0.85}>
                  <Text style={[styles.bulkBtnText, styles.bulkBtnTextPrimary]}>Desalocar tudo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnMuted]} onPress={clearAll} activeOpacity={0.85}>
                  <Text style={[styles.bulkBtnText, styles.bulkBtnTextMuted]}>Zerar</Text>
                </TouchableOpacity>
              </View>

              {categories.map((c) => (
                <Card key={c.category}>
                  <Text style={styles.catTitle}>
                    {c.category} · disponível {c.head_count}
                  </Text>
                  <SliderInput
                    value={amounts[c.category] ?? 0}
                    onValueChange={(v) => setAmount(c.category, v)}
                    min={0}
                    max={c.head_count}
                    step={1}
                    unit="cab"
                  />
                </Card>
              ))}

              <Card>
                <Text style={styles.summaryText}>
                  Total a desalocar · <Text style={styles.summaryBold}>{selectedTotal} cab</Text>
                </Text>
              </Card>
            </>
          )}

          {paddockId && categories.length === 0 && (
            <Text style={styles.empty}>Este piquete não tem gado.</Text>
          )}
        </ScrollView>

        {paddockId && categories.length > 0 && (
          <View style={styles.stickyFooter}>
            <Button
              title="Revisar e confirmar"
              onPress={goToReview}
              disabled={selectedTotal === 0}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
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
  bulkRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bulkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  bulkBtnPrimary: { borderColor: NSA.warn, backgroundColor: NSA.warnBg },
  bulkBtnMuted: { borderColor: NSA.borderStrong, backgroundColor: NSA.bgElevated },
  bulkBtnText: { fontSize: 13, fontFamily: Fonts.semibold },
  bulkBtnTextPrimary: { color: NSA.warnFg },
  bulkBtnTextMuted: { color: NSA.inkSecondary },
  catTitle: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  summaryText: { fontSize: 14, color: NSA.inkPrimary, textAlign: 'center', fontFamily: Fonts.regular },
  summaryBold: { fontFamily: Fonts.semibold },
  empty: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 24, fontFamily: Fonts.regular },
  reviewNote: { fontSize: 12, color: NSA.inkSecondary, marginTop: 12, lineHeight: 17, fontFamily: Fonts.regular },
  piqueteHeader: {
    backgroundColor: NSA.green50,
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 8,
    marginTop: 4,
  },
  piqueteLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
  },
  piqueteValue: { fontSize: 16, fontFamily: Fonts.semibold, color: NSA.inkPrimary, marginTop: 2, letterSpacing: -0.15 },
});
