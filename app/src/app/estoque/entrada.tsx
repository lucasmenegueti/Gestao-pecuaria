import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput } from '@/components/ui';
import { Colors } from '@/constants';

export default function EntradaEstoqueScreen() {
  const db = useDatabase();
  const [formulas, setFormulas] = useState<Array<{ id: number; name: string }>>([]);
  const [formulaId, setFormulaId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM formulas WHERE active=1')
      .then(setFormulas);
  }, []);

  async function handleSave() {
    if (!formulaId) { Alert.alert('Erro', 'Selecione um produto'); return; }
    try {
      const existing = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM inventory WHERE formula_id=? AND location='central'",
        [Number(formulaId)]
      );
      if (existing) {
        await db.runAsync('UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE id=?', [quantity, existing.id]);
      } else {
        await db.runAsync("INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES (?,?,0,'central')",
          [Number(formulaId), quantity]);
      }
      Alert.alert('Sucesso', `${quantity} sacos adicionados!`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar entrada');
    }
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
        <Button title="REGISTRAR ENTRADA" variant="success" onPress={handleSave} size="large" style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#2d8a4e', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 18, fontWeight: '800', color: '#2c2c2c', marginBottom: 10 },
});
