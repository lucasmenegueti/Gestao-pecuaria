import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Button, Card, MultiChoice, SliderInput, SummaryRow } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setReviewing(false)}>
            <Text style={styles.back}>← VOLTAR</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Entrada</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: Colors.success }}>
            <Text style={styles.reviewLabel}>ENTRADA NO ESTOQUE CENTRAL</Text>
            <SummaryRow label="Produto" value={formulaName} />
            <SummaryRow label="Quantidade" value={`${quantity} sacos`} valueColor={Colors.success} />
            <Text style={styles.reviewNote}>
              Essa entrada será contabilizada como {quantity} sacos adicionados ao estoque central
              e registrada no ledger (relatório de movimentações).
            </Text>
          </Card>

          <Button
            title={submitting ? 'REGISTRANDO...' : `CONFIRMAR ENTRADA · ${quantity} sacos`}
            onPress={handleConfirm}
            variant="success"
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
        <Text style={styles.headerTitle}>Entrada de Estoque</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>PRODUTO</Text>
        <MultiChoice
          options={formulas.map((f) => ({ value: String(f.id), label: f.name }))}
          value={formulaId}
          onChange={setFormulaId}
        />
        <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE</Text>
        <SliderInput value={quantity} onValueChange={setQuantity} min={1} max={500} step={1} unit="sacos" color={Colors.success} />
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Button
          title={!formulaId ? 'SELECIONE UM PRODUTO' : `REVISAR · ${quantity} sacos`}
          variant="success"
          onPress={goToReview}
          size="large"
          disabled={!formulaId || quantity <= 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#2d8a4e', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },
  label: { fontSize: 18, fontWeight: '800', color: '#2c2c2c', marginBottom: 10 },
  reviewLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  reviewNote: { fontSize: 13, color: Colors.textMuted, marginTop: 12, fontStyle: 'italic', lineHeight: 18 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0dcd5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
});
