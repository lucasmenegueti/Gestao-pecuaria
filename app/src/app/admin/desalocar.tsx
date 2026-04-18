import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      WHERE p.active = 1
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
      'SELECT category, head_count FROM herd WHERE paddock_id = ? ORDER BY category',
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
    console.log('[desalocar] handleConfirm start', { paddockId, entries });
    if (!paddockId || entries.length === 0) {
      console.warn('[desalocar] abort: no paddock or entries');
      return;
    }
    if (submittingRef.current) {
      console.warn('[desalocar] handleConfirm já em andamento — ignorando double-tap');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      for (const [cat, qty] of entries) {
        const row = await db.getFirstAsync<{ head_count: number }>(
          'SELECT head_count FROM herd WHERE paddock_id = ? AND category = ?',
          [Number(paddockId), cat]
        );
        const available = row?.head_count ?? 0;
        if (qty > available) {
          console.warn('[desalocar] insuficiente', { cat, qty, available });
          Alert.alert(
            'Quantidade insuficiente',
            `${cat}: disponível ${available}, tentou desalocar ${qty}.`
          );
          submittingRef.current = false;
      setSubmitting(false);
          return;
        }
      }

      for (const [cat, qty] of entries) {
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
      // NÃO deletar rows com head_count=0 — a coluna supabase_id precisa ser preservada
      // pra sync fazer UPDATE, não INSERT (que daria UNIQUE violation e duplicar via heal).
      // UI já filtra head_count > 0 nas telas de exibição.
      console.log('[desalocar] success, navigating back');
      submittingRef.current = false;
      setSubmitting(false);
      setReviewing(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/rebanho');
      }
    } catch (err) {
      console.error('[desalocar] falha', err);
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setReviewing(false)}>
            <Text style={styles.back}>← VOLTAR</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Desalocação</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: Colors.warning }}>
            <Text style={styles.reviewLabel}>PIQUETE</Text>
            <Text style={styles.reviewValue}>{paddockName}</Text>

            <Text style={[styles.reviewLabel, { marginTop: 16 }]}>VAI DESALOCAR</Text>
            {selectedEntries.map(([cat, qty]) => (
              <View key={cat} style={styles.reviewRow}>
                <Text style={styles.reviewCat}>{cat}</Text>
                <Text style={styles.reviewQty}>{qty} cab</Text>
              </View>
            ))}
            <View style={[styles.reviewRow, styles.reviewTotal]}>
              <Text style={styles.reviewTotalLabel}>TOTAL</Text>
              <Text style={styles.reviewTotalQty}>{selectedTotal} cab</Text>
            </View>

            <Text style={styles.reviewNote}>
              Essas cabeças sairão do piquete e ficarão na pool de DESALOCADOS, prontas para
              formar novos lotes.
            </Text>
          </Card>

          <Button
            title={submitting ? 'PROCESSANDO...' : 'CONFIRMAR'}
            onPress={handleConfirm}
            size="large"
            disabled={submitting}
            style={{ marginTop: 16 }}
          />
          <Button
            title="VOLTAR E AJUSTAR"
            variant="outline"
            onPress={() => setReviewing(false)}
            disabled={submitting}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Desalocar Lote</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Se veio com paddockId pré-selecionado (link do Rebanho), esconde o seletor. */}
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
            <Text style={styles.label}>QUANTIDADE POR CATEGORIA</Text>
            <Text style={styles.sublabel}>
              {categories.reduce((s, c) => s + c.head_count, 0)} cab disponíveis no piquete
            </Text>

            <View style={styles.bulkRow}>
              <TouchableOpacity
                style={[styles.bulkBtn, styles.bulkBtnPrimary]}
                onPress={fillAll}
                activeOpacity={0.7}
              >
                <Text style={[styles.bulkBtnText, styles.bulkBtnTextPrimary]}>
                  ✓ DESALOCAR TUDO
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, styles.bulkBtnMuted]}
                onPress={clearAll}
                activeOpacity={0.7}
              >
                <Text style={[styles.bulkBtnText, styles.bulkBtnTextMuted]}>ZERAR</Text>
              </TouchableOpacity>
            </View>

            {categories.map((c) => (
              <Card key={c.category}>
                <Text style={styles.catTitle}>
                  {c.category} • disponível: {c.head_count}
                </Text>
                <SliderInput
                  value={amounts[c.category] ?? 0}
                  onValueChange={(v) => setAmount(c.category, v)}
                  min={0}
                  max={c.head_count}
                  step={1}
                  unit="cab"
                  color={Colors.warning}
                />
              </Card>
            ))}

            <Card style={{ backgroundColor: Colors.primaryLight, marginTop: 8 }}>
              <Text style={styles.summaryText}>
                Total a desalocar: <Text style={styles.summaryBold}>{selectedTotal} cab</Text>
              </Text>
            </Card>

            <Button
              title="REVISAR E CONFIRMAR"
              onPress={goToReview}
              size="large"
              disabled={selectedTotal === 0}
              style={{ marginTop: 16 }}
            />
          </>
        )}

        {paddockId && categories.length === 0 && (
          <Text style={styles.empty}>Este piquete não tem gado.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 24, marginBottom: 2 },
  sublabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  bulkRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bulkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  bulkBtnPrimary: { borderColor: Colors.warning, backgroundColor: '#fef5ea' },
  bulkBtnMuted: { borderColor: Colors.border },
  bulkBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  bulkBtnTextPrimary: { color: Colors.warning },
  bulkBtnTextMuted: { color: Colors.textMuted },
  catTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  summaryText: { fontSize: 16, color: Colors.text, textAlign: 'center' },
  summaryBold: { fontWeight: '800' },
  empty: { fontSize: 16, color: Colors.textMuted, textAlign: 'center', marginTop: 24 },
  reviewLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  reviewValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewCat: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  reviewQty: { fontSize: 16, fontWeight: '700', color: Colors.text },
  reviewTotal: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: Colors.warning, marginTop: 4 },
  reviewTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.warning },
  reviewTotalQty: { fontSize: 16, fontWeight: '800', color: Colors.warning },
  reviewNote: { fontSize: 13, color: Colors.textMuted, marginTop: 16, fontStyle: 'italic', lineHeight: 18 },
  piqueteHeader: {
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  piqueteLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  piqueteValue: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 2 },
});
