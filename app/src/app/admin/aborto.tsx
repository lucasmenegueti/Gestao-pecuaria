import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader, KeyboardAvoider } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption { id: number; name: string }
interface CategoryRow { category: string; head_count: number }

// Aborto só faz sentido onde há matriz. Mesma lógica pragmática do nascimento:
// o inventário não rastreia prenhez com precisão, então qualquer vaca/novilha vale.
const PARENT_CATEGORIES = ['VACA PARIDA', 'VACA PRENHA', 'VACA SOLTEIRA', 'NOVILHA', 'NOVILHA PRENHA'];

// Quem aborta deixa de estar prenha: a matriz evolui junto com o registro
// (mesma convenção do Evoluir — evento EVOLUCAO com "ORIGEM → DESTINO" nas notes).
const POST_ABORT: Record<string, string> = {
  'VACA PRENHA': 'VACA SOLTEIRA',
  'NOVILHA PRENHA': 'NOVILHA',
};

export default function AbortoScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(params.paddockId ?? null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const placeholders = PARENT_CATEGORIES.map(() => '?').join(',');
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0 AND h.category IN (${placeholders})
      ORDER BY p.name
    `, PARENT_CATEGORIES).then(setPaddocks);
  }, []);

  useEffect(() => {
    if (!paddockId) {
      setCategories([]);
      return;
    }
    const placeholders = PARENT_CATEGORIES.map(() => '?').join(',');
    db.getAllAsync<CategoryRow>(
      `SELECT category, head_count FROM herd
       WHERE paddock_id = ? AND head_count > 0 AND category IN (${placeholders})`,
      [Number(paddockId), ...PARENT_CATEGORIES]
    ).then((rows) => {
      setCategories(rows);
      setCategory(rows.length === 1 ? rows[0].category : null);
    });
  }, [paddockId]);

  const paddockName = paddocks.find((p) => String(p.id) === paddockId)?.name ?? '';
  const maxCount = categories.find((c) => c.category === category)?.head_count ?? 20;

  async function handleConfirm() {
    if (!paddockId || !category || count < 1 || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // O aborto é indicador reprodutivo: a matriz continua no inventário.
      // Mas prenha que aborta vira solteira — a evolução sai na mesma transação.
      const to = POST_ABORT[category];
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date)
           VALUES (?, 'ABORTO', ?, ?, ?, date('now','localtime'))`,
          [Number(paddockId), category, count, notes.trim() || null]
        );
        if (!to) return;
        await db.runAsync(
          'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id = ? AND category = ?',
          [count, Number(paddockId), category]
        );
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
          [Number(paddockId), to]
        );
        if (existing) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [count, existing.id]);
        } else {
          await db.runAsync(
            'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
            [Number(paddockId), to, count]
          );
        }
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date)
           VALUES (?, 'EVOLUCAO', ?, ?, ?, date('now','localtime'))`,
          [Number(paddockId), category, count, `${category} → ${to} · aborto`]
        );
      });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao registrar aborto.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (paddocks.length === 0) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Aborto" context="Rebanho" onBack={() => router.back()} />
        <Text style={styles.empty}>
          Nenhum piquete com vaca ou novilha. Aborto só é possível onde há matriz.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Registrar aborto" context="Rebanho" onBack={() => router.back()} />
      <KeyboardAvoider>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!params.paddockId && (
            <>
              <Text style={styles.label}>PIQUETE</Text>
              <Text style={styles.sublabel}>Só piquetes com vaca ou novilha aparecem aqui</Text>
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
              <Text style={[styles.label, { marginTop: 22 }]}>CATEGORIA DA MATRIZ</Text>
              <MultiChoice
                options={categories.map((c) => ({ value: c.category, label: c.category }))}
                value={category}
                onChange={setCategory}
              />

              <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE DE ABORTOS</Text>
              <Card>
                <SliderInput value={count} onValueChange={setCount} min={1} max={maxCount} step={1} unit="cab" color={NSA.danger} />
              </Card>

              <Text style={[styles.label, { marginTop: 22 }]}>OBSERVAÇÃO (OPCIONAL)</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex.: causa suspeita, brinco da matriz…"
                placeholderTextColor={NSA.inkDisabled}
                multiline
              />

              <Card borderColor={NSA.danger}>
                <SummaryRow label="Piquete" value={paddockName} />
                <SummaryRow label="Matriz" value={category ?? '—'} />
                <SummaryRow label="Abortos" value={`${count}`} valueColor={NSA.dangerFg} />
                {category && POST_ABORT[category] ? (
                  <SummaryRow label="Após o registro" value={`${category} → ${POST_ABORT[category]}`} />
                ) : null}
                <Text style={styles.note}>
                  {category && POST_ABORT[category]
                    ? `A matriz continua no inventário — só muda de categoria: quem aborta deixa de estar prenha e vira ${POST_ABORT[category]!.toLowerCase()}.`
                    : 'A matriz continua no inventário — nada é descontado.'}
                </Text>
              </Card>

              <Button
                title={submitting ? 'Registrando…' : 'Confirmar aborto'}
                onPress={handleConfirm}
                disabled={submitting || !category}
                variant="danger"
                style={{ marginTop: 14 }}
              />
            </>
          )}
          {paddockId && categories.length === 0 && (
            <Text style={styles.empty}>Este piquete não tem vaca ou novilha.</Text>
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
  empty: { fontSize: 14, color: NSA.inkMuted, textAlign: 'center', marginTop: 60, fontFamily: Fonts.regular, padding: 24 },
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
