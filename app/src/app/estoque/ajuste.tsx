import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuste Manual (Perda)</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>⚠️ Atenção</Text>
          <Text style={styles.warnText}>
            Esse ajuste é registrado como <Text style={{ fontWeight: '800' }}>PERDA</Text> no
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

        <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE A REMOVER</Text>
        <SliderInput
          value={quantity}
          onValueChange={setQuantity}
          min={1}
          max={Math.max(maxQty, 1)}
          step={1}
          unit="sacos"
          color={Colors.danger}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>MOTIVO</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: recontagem diff 3 sacos, rasgo, etc."
          multiline
          placeholderTextColor={Colors.textMuted}
        />

        <Button
          title={saving ? 'REGISTRANDO...' : 'REGISTRAR PERDA'}
          variant="danger"
          onPress={handleSave}
          size="large"
          disabled={saving}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#c0392b', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  warnBox: {
    backgroundColor: '#fdecea',
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warnTitle: { fontSize: 14, fontWeight: '800', color: Colors.danger, marginBottom: 4 },
  warnText: { fontSize: 13, color: '#2c2c2c', lineHeight: 18 },
  label: { fontSize: 16, fontWeight: '800', color: '#2c2c2c', marginBottom: 8 },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
});
