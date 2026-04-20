import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput, BrandHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { NSA, Fonts, Radius } from '@/theme/nsa';

export default function AjusteEstoqueScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<Array<{ id: number; formula_id: number; name: string; qty: number }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [maxQty, setMaxQty] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getAllAsync<{ id: number; formula_id: number; name: string; quantity_sacks: number }>(
      "SELECT i.id, i.formula_id, f.name, i.quantity_sacks FROM inventory i JOIN formulas f ON f.id=i.formula_id WHERE i.location='central' AND i.quantity_sacks > 0"
    ).then((rows) =>
      setItems(rows.map((r) => ({ id: r.id, formula_id: r.formula_id, name: r.name, qty: r.quantity_sacks })))
    );
  }, []);

  useEffect(() => {
    const item = items.find((i) => String(i.id) === selectedId);
    if (item) {
      setMaxQty(item.qty);
      if (quantity > item.qty) setQuantity(item.qty);
    }
  }, [selectedId]);

  async function handleSave() {
    if (!selectedId) {
      Alert.alert('Erro', 'Selecione um produto');
      return;
    }
    const item = items.find((i) => String(i.id) === selectedId);
    if (!item) return;
    if (!reason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do ajuste (obrigatório p/ relatório).');
      return;
    }
    setSaving(true);
    try {
      await db.runAsync(
        'UPDATE inventory SET quantity_sacks = MAX(0, quantity_sacks - ?) WHERE id=?',
        [quantity, Number(selectedId)]
      );
      await db.runAsync(
        `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
         VALUES (?, ?, NULL, ?, ?, ?)`,
        ['AJUSTE_PERDA_CENTRAL', item.formula_id, -quantity, reason.trim(), user?.id ?? null]
      );
      Alert.alert('Registrado', `${quantity} saco(s) removidos (perda).`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar ajuste');
    }
    setSaving(false);
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Ajuste manual" context="Estoque · Perda" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.warnBox}>
            <View style={styles.warnHeader}>
              <AlertTriangle size={14} color={NSA.dangerFg} strokeWidth={1.75} />
              <Text style={styles.warnTitle}>ATENÇÃO</Text>
            </View>
            <Text style={styles.warnText}>
              Esse ajuste é registrado como <Text style={{ fontFamily: Fonts.semibold }}>perda</Text> no
              relatório de inventário. Use só para diferença de inventário, desvio ou dano. Saídas
              normais de estoque acontecem via reabastecimento.
            </Text>
          </View>

          <Text style={styles.label}>PRODUTO</Text>
          <MultiChoice
            options={items.map((i) => ({ value: String(i.id), label: `${i.name} (${i.qty} sacos)` }))}
            value={selectedId}
            onChange={setSelectedId}
          />

          <Text style={[styles.label, { marginTop: 22 }]}>QUANTIDADE A REMOVER</Text>
          <SliderInput
            value={quantity}
            onValueChange={setQuantity}
            min={1}
            max={Math.max(maxQty, 1)}
            step={1}
            unit="sacos"
            color={NSA.danger}
          />

          <Text style={[styles.label, { marginTop: 22 }]}>MOTIVO</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Ex.: recontagem diff 3 sacos, rasgo, etc."
            multiline
            placeholderTextColor={NSA.inkDisabled}
          />

          <Button
            title={saving ? 'Registrando…' : 'Registrar perda'}
            variant="danger"
            onPress={handleSave}
            disabled={saving}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  warnBox: {
    backgroundColor: NSA.dangerBg,
    borderLeftWidth: 3,
    borderLeftColor: NSA.danger,
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 18,
  },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  warnTitle: { fontSize: 11, fontFamily: Fonts.medium, letterSpacing: 1.2, color: NSA.dangerFg },
  warnText: { fontSize: 12, color: NSA.inkPrimary, lineHeight: 17, fontFamily: Fonts.regular },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 10,
  },
  input: {
    minHeight: 80,
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
  },
});
