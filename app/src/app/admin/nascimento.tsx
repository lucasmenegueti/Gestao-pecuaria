import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockOption { id: number; name: string; has_parents: number }

// Nascimento só faz sentido em piquete com VACA ou NOVILHA.
const PARENT_CATEGORIES = ['VACA PARIDA', 'VACA PRENHA', 'VACA SOLTEIRA', 'NOVILHA'];
const CALF_OPTIONS = [
  { value: 'BEZERRO MAMANDO', label: 'Bezerro mamando (macho)' },
  { value: 'BEZERRA MAMANDO', label: 'Bezerra mamando (fêmea)' },
];

export default function NascimentoScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ paddockId?: string }>();
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(params.paddockId ?? null);
  const [category, setCategory] = useState<string | null>('BEZERRO MAMANDO');
  const [count, setCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const placeholders = PARENT_CATEGORIES.map(() => '?').join(',');
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name, 1 AS has_parents FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1 AND h.head_count > 0 AND h.category IN (${placeholders})
      ORDER BY p.name
    `, PARENT_CATEGORIES).then(setPaddocks);
  }, []);

  const paddockName = paddocks.find((p) => String(p.id) === paddockId)?.name ?? '';

  async function handleConfirm() {
    if (!paddockId || !category || count < 1 || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Cria ou incrementa lote da categoria bezerro/bezerra mamando no piquete
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
        [Number(paddockId), category]
      );
      if (existing) {
        await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [count, existing.id]);
      } else {
        await db.runAsync(
          'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
          [Number(paddockId), category, count]
        );
      }
      await db.runAsync(
        `INSERT INTO herd_events (paddock_id, event_type, category, head_count, date)
         VALUES (?, 'NASCIMENTO', ?, ?, date('now','localtime'))`,
        [Number(paddockId), category, count]
      );
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao registrar nascimento.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (paddocks.length === 0) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Nascimento" context="Rebanho" onBack={() => router.back()} />
        <Text style={styles.empty}>
          Nenhum piquete com vaca ou novilha. Nascimento só é possível onde há matriz.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Registrar nascimento" context="Rebanho" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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

          {paddockId && (
            <>
              <Text style={[styles.label, { marginTop: 22 }]}>CATEGORIA</Text>
              <MultiChoice options={CALF_OPTIONS} value={category} onChange={setCategory} />

              <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE</Text>
              <Card>
                <SliderInput value={count} onValueChange={setCount} min={1} max={20} step={1} unit="cab" />
              </Card>

              <Card borderColor={NSA.ok}>
                <SummaryRow label="Piquete" value={paddockName} />
                <SummaryRow label="Categoria" value={category ?? '—'} />
                <SummaryRow label="Quantidade" value={`${count} cab`} valueColor={NSA.ok} />
              </Card>

              <Button
                title={submitting ? 'Registrando…' : 'Confirmar nascimento'}
                onPress={handleConfirm}
                
                disabled={submitting || !category}
                style={{ marginTop: 14 }}
              />
            </>
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
  empty: { fontSize: 14, color: NSA.inkMuted, textAlign: 'center', marginTop: 60, fontFamily: Fonts.regular, padding: 24 },
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
