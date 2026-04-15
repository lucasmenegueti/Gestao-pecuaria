import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

export default function SaidaEstoqueScreen() {
  const db = useDatabase();
  const [items, setItems] = useState<Array<{ id: number; formula_id: number; name: string; qty: number }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(5);
  const [maxQty, setMaxQty] = useState(500);

  useEffect(() => {
    db.getAllAsync<{ id: number; formula_id: number; name: string; quantity_sacks: number }>(
      "SELECT i.id, i.formula_id, f.name, i.quantity_sacks FROM inventory i JOIN formulas f ON f.id=i.formula_id WHERE i.location='central' AND i.quantity_sacks > 0"
    ).then((rows) => setItems(rows.map(r => ({ id: r.id, formula_id: r.formula_id, name: r.name, qty: r.quantity_sacks }))));
  }, []);

  useEffect(() => {
    const item = items.find(i => String(i.id) === selectedId);
    if (item) {
      setMaxQty(item.qty);
      if (quantity > item.qty) setQuantity(item.qty);
    }
  }, [selectedId]);

  async function handleSave() {
    if (!selectedId) { Alert.alert('Erro', 'Selecione um produto'); return; }
    try {
      await db.runAsync('UPDATE inventory SET quantity_sacks = MAX(0, quantity_sacks - ?) WHERE id=?', [quantity, Number(selectedId)]);
      Alert.alert('Sucesso', `${quantity} sacos retirados!`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar saída');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saída de Estoque</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>PRODUTO</Text>
        <MultiChoice
          options={items.map((i) => ({ value: String(i.id), label: `${i.name} (${i.qty} sacos)` }))}
          value={selectedId}
          onChange={setSelectedId}
        />
        <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE</Text>
        <SliderInput value={quantity} onValueChange={setQuantity} min={1} max={Math.max(maxQty, 1)} step={1} unit="sacos" color={Colors.danger} />
        <Button title="REGISTRAR SAÍDA" variant="danger" onPress={handleSave} size="large" style={{ marginTop: 24 }} />
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
  label: { fontSize: 18, fontWeight: '800', color: '#2c2c2c', marginBottom: 10 },
});
