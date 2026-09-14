import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader, KeyboardAvoider, PhotoButton } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption { id: number; name: string }
interface CategoryRow { category: string; head_count: number }

type DeathKind = 'BEZERRO' | 'OUTRAS';
const KIND_OPTIONS = [
  { value: 'BEZERRO', label: 'Bezerro/a nascido', description: 'Bezerro ou bezerra mamando · a vaca parida vira solteira', color: NSA.danger },
  { value: 'OUTRAS', label: 'Outras mortes', description: 'Qualquer categoria', color: NSA.danger },
];
// Bezerro "nascido" = ainda mamando; é o que forma par com VACA PARIDA.
const CALF_CATEGORIES = ['BEZERRO MAMANDO', 'BEZERRA MAMANDO'];
// Mesma convenção do aborto: evento EVOLUCAO com "ORIGEM → DESTINO · obs" nas notes
// (paddock-info.ts parseia por esses separadores).
const COW_FROM = 'VACA PARIDA';
const COW_TO = 'VACA SOLTEIRA';

export default function MorteScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(params.paddockId ?? null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [kind, setKind] = useState<DeathKind | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
  const visibleCategories = kind === 'BEZERRO'
    ? categories.filter((c) => CALF_CATEGORIES.includes(c.category))
    : categories;
  // Uma vaca parida por bezerro morto, limitado ao que o piquete registra
  // (o `herd` não é confiável — ver docs/ARQUITETURA-E-DADOS.md §5).
  const cowsAvailable = categories.find((c) => c.category === COW_FROM)?.head_count ?? 0;
  const evolveCount = kind === 'BEZERRO' ? Math.min(selectedTotal, cowsAvailable) : 0;

  function changeKind(v: string) {
    setKind(v as DeathKind);
    setAmounts({});
  }

  function goToReview() {
    if (!paddockId || selectedTotal === 0) return;
    setReviewing(true);
  }

  async function handleConfirm() {
    if (!paddockId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const pid = Number(paddockId);
      await db.withTransactionAsync(async () => {
        for (const [cat, qty] of selectedEntries) {
          await db.runAsync(
            'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
            [qty, pid, cat]
          );
          await db.runAsync(
            `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, photo_local_uri, date)
             VALUES (?, 'MORTE', ?, ?, ?, ?, date('now','localtime'))`,
            [pid, cat, qty, reason.trim() || null, photoUri]
          );
        }
        if (evolveCount === 0) return;
        // Bezerro morreu: a vaca deixa de ser parida (mesma mecânica do aborto).
        await db.runAsync(
          'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
          [evolveCount, pid, COW_FROM]
        );
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
          [pid, COW_TO]
        );
        if (existing) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [evolveCount, existing.id]);
        } else {
          await db.runAsync(
            'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
            [pid, COW_TO, evolveCount]
          );
        }
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date)
           VALUES (?, 'EVOLUCAO', ?, ?, ?, date('now','localtime'))`,
          [pid, COW_FROM, evolveCount, `${COW_FROM} → ${COW_TO} · morte de bezerro`]
        );
      });
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
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Card borderColor={NSA.danger}>
              <SummaryRow label="Piquete" value={paddockName} />
              {selectedEntries.map(([cat, qty]) => (
                <SummaryRow key={cat} label={cat} value={`${qty} cab`} />
              ))}
              <SummaryRow label="Total" value={`${selectedTotal} cab`} valueColor={NSA.dangerFg} />
              {reason.trim() ? <SummaryRow label="Motivo" value={reason.trim()} /> : null}
              {photoUri ? <SummaryRow label="Foto" value="anexada" /> : null}
              {kind === 'BEZERRO' ? (
                <SummaryRow
                  label="Após o registro"
                  value={evolveCount > 0 ? `${evolveCount} ${COW_FROM} → ${COW_TO}` : 'Sem vaca parida no piquete'}
                />
              ) : null}
              <Text style={styles.note}>
                {kind === 'BEZERRO'
                  ? evolveCount > 0
                    ? `Os bezerros saem do inventário e ${evolveCount} vaca(s) parida(s) viram solteira(s).${evolveCount < selectedTotal ? ` O piquete só registra ${cowsAvailable} vaca(s) parida(s), então só essas evoluem.` : ''}`
                    : 'Os bezerros saem do inventário. Nenhuma vaca parida registrada neste piquete pra evoluir.'
                  : 'Essas cabeças saem do inventário. O evento fica guardado com a causa pra relatório.'}
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
      <KeyboardAvoider>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>QUE TIPO DE MORTE?</Text>
          <MultiChoice options={KIND_OPTIONS} value={kind} onChange={changeKind} />

          {kind && !params.paddockId && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>PIQUETE</Text>
              <MultiChoice
                options={paddocks.map((p) => ({ value: String(p.id), label: p.name }))}
                value={paddockId}
                onChange={setPaddockId}
              />
            </>
          )}
          {kind && params.paddockId && paddockName && (
            <View style={[styles.piqueteHeader, { marginTop: 20 }]}>
              <Text style={styles.piqueteLabel}>PIQUETE</Text>
              <Text style={styles.piqueteValue}>{paddockName}</Text>
            </View>
          )}

          {kind && paddockId && visibleCategories.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE POR CATEGORIA</Text>
              <Text style={styles.sublabel}>
                {visibleCategories.reduce((s, c) => s + c.head_count, 0)} cab {kind === 'BEZERRO' ? 'mamando' : ''} no piquete
              </Text>
              {visibleCategories.map((c) => (
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

              <Text style={[styles.label, { marginTop: 22 }]}>FOTO (OPCIONAL)</Text>
              <PhotoButton uri={photoUri} onPhoto={setPhotoUri} />

              <Button
                title={selectedTotal === 0 ? 'Selecione quantidade' : `Revisar · ${selectedTotal} cab`}
                onPress={goToReview}
                disabled={selectedTotal === 0}
                style={{ marginTop: 14 }}
              />
            </>
          )}
          {kind && paddockId && visibleCategories.length === 0 && (
            <Text style={styles.empty}>
              {kind === 'BEZERRO' ? 'Este piquete não tem bezerro mamando.' : 'Este piquete não tem gado.'}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoider>
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
