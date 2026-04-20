import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Button, Card, MultiChoice, SliderInput, SummaryRow, BrandHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { NSA, Fonts } from '@/theme/nsa';

export default function EntradaEstoqueScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [formulas, setFormulas] = useState<Array<{ id: number; name: string }>>([]);
  const [formulaId, setFormulaId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(10);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM formulas WHERE active=1')
      .then(setFormulas);
  }, []);

  const formulaName = formulas.find((f) => String(f.id) === formulaId)?.name ?? '';

  function goToReview() {
    if (!formulaId) {
      Alert.alert('Erro', 'Selecione um produto');
      return;
    }
    if (quantity <= 0) {
      Alert.alert('Erro', 'Quantidade precisa ser maior que 0');
      return;
    }
    setReviewing(true);
  }

  async function handleConfirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const existing = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM inventory WHERE formula_id=? AND location='central'",
        [Number(formulaId)]
      );
      if (existing) {
        await db.runAsync('UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE id=?', [quantity, existing.id]);
      } else {
        await db.runAsync(
          "INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES (?,?,0,'central')",
          [Number(formulaId), quantity]
        );
      }
      await db.runAsync(
        `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
         VALUES ('ENTRADA_CENTRAL', ?, NULL, ?, 'Entrada manual', ?)`,
        [Number(formulaId), quantity, user?.id ?? null]
      );
      router.back();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar entrada');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (reviewing) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Confirmar entrada" context="Estoque" onBack={() => setReviewing(false)} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Card borderColor={NSA.ok}>
              <Text style={styles.reviewLabel}>ENTRADA NO ESTOQUE CENTRAL</Text>
              <SummaryRow label="Produto" value={formulaName} />
              <SummaryRow label="Quantidade" value={`${quantity} sacos`} valueColor={NSA.ok} />
              <Text style={styles.reviewNote}>
                Essa entrada será contabilizada como {quantity} sacos adicionados ao estoque central
                e registrada no ledger (relatório de movimentações).
              </Text>
            </Card>
          </ScrollView>

          <View style={styles.stickyFooter}>
            <Button
              title={submitting ? 'Registrando…' : `Confirmar entrada · ${quantity} sacos`}
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
      <BrandHeader title="Entrada de estoque" context="Central" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>PRODUTO</Text>
          <MultiChoice
            options={formulas.map((f) => ({ value: String(f.id), label: f.name }))}
            value={formulaId}
            onChange={setFormulaId}
          />
          <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE</Text>
          <SliderInput value={quantity} onValueChange={setQuantity} min={1} max={500} step={1} unit="sacos" />
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button
            title={!formulaId ? 'Selecione um produto' : `Revisar · ${quantity} sacos`}
            onPress={goToReview}
            disabled={!formulaId || quantity <= 0}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 10,
  },
  reviewLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  reviewNote: {
    fontSize: 12,
    color: NSA.inkSecondary,
    marginTop: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
});
