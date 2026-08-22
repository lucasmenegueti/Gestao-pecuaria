import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, SummaryRow, BrandHeader, KeyboardAvoider} from '@/components/ui';
import { CATTLE_CATEGORIES, DEFAULT_WEIGHT_KG } from '@/constants';
import { NSA, Fonts } from '@/theme/nsa';

/**
 * Compra de gado. Entra direto no pool (paddock_id IS NULL) — depois o usuário
 * aloca em piquete específico via /admin/alocar. Evento COMPRA guarda
 * weight_kg (peso médio de balança ou estimado) pra relatório.
 */
export default function CompraScreen() {
  const db = useDatabase();
  const [category, setCategory] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [weightKg, setWeightKg] = useState(400);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const categoryLabel = CATTLE_CATEGORIES.find((c) => c.value === category)?.label ?? '';

  function onCategoryChange(v: string | null) {
    setCategory(v);
    if (v && DEFAULT_WEIGHT_KG[v]) setWeightKg(DEFAULT_WEIGHT_KG[v]);
  }

  function goToReview() {
    if (!category || count <= 0) return;
    setReviewing(true);
  }

  async function handleConfirm() {
    if (submittingRef.current || !category) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM herd WHERE paddock_id IS NULL AND category = ?',
        [category]
      );
      if (existing) {
        await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [count, existing.id]);
      } else {
        await db.runAsync(
          'INSERT INTO herd (paddock_id, category, head_count) VALUES (NULL, ?, ?)',
          [category, count]
        );
      }
      await db.runAsync(
        `INSERT INTO herd_events (paddock_id, event_type, category, head_count, weight_kg, date)
         VALUES (NULL, 'COMPRA', ?, ?, ?, date('now','localtime'))`,
        [category, count, weightKg]
      );
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao registrar compra.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (reviewing) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Confirmar compra" context="Rebanho" onBack={() => setReviewing(false)} />
        <KeyboardAvoider>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Card borderColor={NSA.ok}>
              <SummaryRow label="Categoria" value={categoryLabel} />
              <SummaryRow label="Quantidade" value={`${count} cab`} valueColor={NSA.ok} />
              <SummaryRow label="Peso médio (balança/estimado)" value={`${weightKg} kg`} />
              <SummaryRow label="Peso total" value={`${(weightKg * count).toLocaleString('pt-BR')} kg`} valueColor={NSA.inkPrimary} />
              <Text style={styles.note}>
                Essas cabeças entram como desalocadas no pool. Depois você aloca em um piquete.
              </Text>
            </Card>
            <Button
              title={submitting ? 'Processando…' : 'Confirmar compra'}
              onPress={handleConfirm}
              disabled={submitting}
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
        </KeyboardAvoider>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Comprar gado" context="Rebanho" onBack={() => router.back()} />
      <KeyboardAvoider>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>CATEGORIA</Text>
          <MultiChoice
            options={CATTLE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            value={category}
            onChange={onCategoryChange}
          />

          <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE</Text>
          <Card>
            <SliderInput value={count} onValueChange={setCount} min={1} max={500} step={1} unit="cab" />
          </Card>

          <Text style={[styles.label, { marginTop: 22 }]}>PESO MÉDIO POR CABEÇA</Text>
          <Text style={styles.sublabel}>Balança se pesou, senão estimado</Text>
          <Card>
            <SliderInput
              value={weightKg}
              onValueChange={setWeightKg}
              min={50}
              max={700}
              step={5}
              unit="kg"
            />
          </Card>

          <Button
            title={!category ? 'Selecione a categoria' : `Revisar · ${count} cab × ${weightKg} kg`}
            onPress={goToReview}
            disabled={!category || count <= 0}
            style={{ marginTop: 14 }}
          />
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
  note: { fontSize: 12, color: NSA.inkSecondary, marginTop: 12, lineHeight: 17, fontFamily: Fonts.regular },
});
