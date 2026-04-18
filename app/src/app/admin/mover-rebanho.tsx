import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, MultiChoice } from '@/components/ui';
import { Colors, CATTLE_CATEGORIES } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PaddockOption {
  id: number;
  name: string;
}

export default function MoverRebanhoScreen() {
  const db = useDatabase();
  const [fromPaddocks, setFromPaddocks] = useState<PaddockOption[]>([]);
  const [toPaddocks, setToPaddocks] = useState<PaddockOption[]>([]);
  const [fromPaddock, setFromPaddock] = useState<string | null>(null);
  const [toPaddock, setToPaddock] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [maxCount, setMaxCount] = useState(500);

  useEffect(() => {
    // Origem: apenas piquetes com gado (exclui pool desalocada — paddock_id IS NULL não bate no JOIN)
    db.getAllAsync<PaddockOption>(`
      SELECT DISTINCT p.id, p.name FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      ORDER BY p.name
    `).then(setFromPaddocks);
    // Destino: qualquer piquete ativo
    db.getAllAsync<PaddockOption>(
      'SELECT id, name FROM paddocks WHERE active=1 ORDER BY name'
    ).then(setToPaddocks);
  }, []);

  useEffect(() => {
    if (fromPaddock && category) {
      db.getFirstAsync<{ head_count: number }>(
        'SELECT head_count FROM herd WHERE paddock_id=? AND category=?',
        [Number(fromPaddock), category]
      ).then((row) => {
        const max = row?.head_count || 0;
        setMaxCount(max);
        if (count > max) setCount(max);
      });
    }
  }, [fromPaddock, category]);

  async function handleMove() {
    if (!fromPaddock || !toPaddock || !category || count <= 0) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    if (fromPaddock === toPaddock) {
      Alert.alert('Erro', 'Origem e destino devem ser diferentes');
      return;
    }
    try {
      const origin = await db.getFirstAsync<{ head_count: number }>(
        'SELECT head_count FROM herd WHERE paddock_id=? AND category=?',
        [Number(fromPaddock), category]
      );
      const available = origin?.head_count ?? 0;
      if (available < count) {
        Alert.alert('Erro', 'Quantidade insuficiente na origem');
        return;
      }
      // Decrease from origin
      await db.runAsync('UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id=? AND category=?',
        [count, Number(fromPaddock), category]);
      // Increase or insert at destination
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM herd WHERE paddock_id=? AND category=?',
        [Number(toPaddock), category]
      );
      if (existing) {
        await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id=?', [count, existing.id]);
      } else {
        await db.runAsync('INSERT INTO herd (paddock_id, category, head_count) VALUES (?,?,?)',
          [Number(toPaddock), category, count]);
      }
      // Log event
      await db.runAsync(
        'INSERT INTO herd_events (paddock_id, event_type, category, head_count, target_paddock_id, date) VALUES (?,?,?,?,?,date(\'now\',\'localtime\'))',
        [Number(fromPaddock), 'TRANSFERENCIA', category, count, Number(toPaddock)]
      );
      // Remove empty rows
      await db.runAsync('DELETE FROM herd WHERE head_count <= 0');
      Alert.alert('Sucesso', `${count} ${category} movidos!`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao mover rebanho');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mover Rebanho</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>DE (Origem)</Text>
        <MultiChoice
          options={fromPaddocks.map((p) => ({ value: String(p.id), label: p.name }))}
          value={fromPaddock}
          onChange={setFromPaddock}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>CATEGORIA</Text>
        <MultiChoice
          options={CATTLE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={setCategory}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE</Text>
        <SliderInput
          value={count}
          onValueChange={setCount}
          min={1}
          max={Math.max(maxCount, 1)}
          step={1}
          unit="cab"
          color={Colors.primary}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>PARA (Destino)</Text>
        <MultiChoice
          options={toPaddocks.filter((p) => String(p.id) !== fromPaddock).map((p) => ({ value: String(p.id), label: p.name }))}
          value={toPaddock}
          onChange={setToPaddock}
        />

        <Button title="MOVER REBANHO" onPress={handleMove} size="large" style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#1a6b54', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 18, fontWeight: '800', color: '#2c2c2c', marginBottom: 10 },
});
