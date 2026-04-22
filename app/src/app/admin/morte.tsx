import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption { id: number; name: string }
interface CategoryRow { category: string; head_count: number }

export default function MorteScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(params.paddockId ?? null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0
      ORDER BY p.name
    `).then(setPaddocks);
  }, []);

  useEffect(() => {
    if (!paddockId) return;
    db.getAllAsync<CategoryRow>(
      'SELECT category, head_count FROM herd WHERE paddock_id = ? AND head_count > 0',
      [Number(paddockId)]
    ).then(setCategories);
    setAmounts({});
  }, [paddockId]);

  function setAmount(cat: string, v: number) {
    setAmounts((p) => ({ ...p, [cat]: v }));
  }

  const selectedEntries = Object.entries(amounts).filter(([, v]) => v > 0);
  const selectedTotal = selectedEntries.reduce((s, [, v]) => s + v, 0);
  const paddockName = paddocks.find((p) => String(p.id) === paddockId)?.name ?? '';

  function goToReview() {
    if (!paddockId || selectedTotal === 0) return;
    setReviewing(true);
  }

  async function handleConfirm() {
    if (!paddockId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      for (const [cat, qty] of selectedEntries) {
        await db.runAsync(
          'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
          [qty, Number(paddockId), cat]
        );
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date)
           VALUES (?, 'MORTE', ?, ?, ?, date('now','localtime'))`,
          [Number(paddockId), cat, qty, reason.trim() || null]
        );
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao registrar morte.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (reviewing) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Confirmar morte" context="Rebanho" onBack={() => setReviewing(false)} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Card borderColor={NSA.danger}>
              <SummaryRow label="Piquete" value={paddockName} />
              {selectedEntries.map(([cat, qty]) => (
                <SummaryRow key={cat} label={cat} value={`${qty} cab`} />
              ))}
              <SummaryRow label="Total" value={`${selectedTotal} cab`} valueColor={NSA.dangerFg} />
              {reason.trim() ? <SummaryRow label="Motivo" value={reason.trim()} /> : null}
              <Text style={styles.note}>
                Essas cabeças saem do inventário. O evento fica guardado com a causa pra relatório.
              </Text>
            </Card>
            <Button
              title={submitting ? 'Processando…' : 'Confirmar morte'}
              onPress={handleConfirm}
              disabled={submitting}
              variant="danger"
              style={{ marginTop: 14 }}
            />
            <Button
              title="Voltar e ajustar"
              variant="outline"
              onPress={() => setReviewing(false)}
              disabled={submitting}
              style={{ marginTop: 10 }}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Registrar morte" context="Rebanho" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {!params.paddockId && (
            <>
              <Text style={styles.label}>PIQUETE</Text>
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
                {categories.reduce((s, c) => s + c.head_count, 0)} cab no piquete
              </Text>
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
                    color={NSA.danger}
                  />
                </Card>
              ))}

              <Text style={[styles.label, { marginTop: 22 }]}>MOTIVO (OPCIONAL)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="Ex.: afogamento, cobra, doença…"
                placeholderTextColor={NSA.inkDisabled}
                multiline
              />

              <Button
                title={selectedTotal === 0 ? 'Selecione quantidade' : `Revisar · ${selectedTotal} cab`}
                onPress={goToReview}
                disabled={selectedTotal === 0}
                style={{ marginTop: 14 }}
              />
            </>
          )}
          {paddockId && categories.length === 0 && (
            <Text style={styles.empty}>Este piquete não tem gado.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 2,
  },
  sublabel: { fontSize: 12, color: NSA.inkMuted, marginBottom: 12, fontFamily: Fonts.regular },
  catTitle: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: NSA.inkPrimary,
    backgroundColor: NSA.bgElevated,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  empty: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 24, fontFamily: Fonts.regular },
  note: { fontSize: 12, color: NSA.inkSecondary, marginTop: 12, lineHeight: 17, fontFamily: Fonts.regular },
  piqueteHeader: {
    backgroundColor: NSA.green50,
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 8,
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
