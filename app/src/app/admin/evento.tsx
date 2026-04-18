import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput } from '@/components/ui';
import { Colors, CATTLE_CATEGORIES } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVENT_TYPES = [
  { value: 'NASCIMENTO', label: 'Nascimento', color: Colors.success },
  { value: 'MORTE', label: 'Morte', color: Colors.danger },
  { value: 'VENDA', label: 'Venda', color: Colors.warning },
  { value: 'COMPRA', label: 'Compra', color: Colors.suplementacao },
];

export default function EventoScreen() {
  const db = useDatabase();
  const [paddocks, setPaddocks] = useState<Array<{ id: number; name: string }>>([]);
  const [paddockCategories, setPaddockCategories] = useState<string[]>([]);
  const [hasVaca, setHasVaca] = useState(false);
  const [eventType, setEventType] = useState<string | null>(null);
  const [paddockId, setPaddockId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM paddocks WHERE active=1 ORDER BY name'
    ).then(setPaddocks);
  }, []);

  // Quando trocar piquete, carregar categorias presentes (usado em NASCIMENTO e MORTE)
  useEffect(() => {
    if (!paddockId) {
      setPaddockCategories([]);
      setHasVaca(false);
      return;
    }
    db.getAllAsync<{ category: string }>(
      'SELECT category FROM herd WHERE paddock_id = ? ORDER BY category',
      [Number(paddockId)]
    ).then((rows) => {
      const cats = rows.map((r) => r.category);
      setPaddockCategories(cats);
      // Qualquer variante de vaca conta pra sugerir bezerro em NASCIMENTO
      setHasVaca(cats.some((c) => c.startsWith('VACA')));
    });
  }, [paddockId]);

  // Sugerir categoria automática no NASCIMENTO quando há VACA no piquete
  useEffect(() => {
    if (eventType === 'NASCIMENTO' && hasVaca && !category) {
      setCategory('BEZERRO MAMANDO');
    }
  }, [eventType, hasVaca]);

  async function handleSave() {
    if (!eventType || !paddockId || !category || count <= 0) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    try {
      await db.runAsync(
        'INSERT INTO herd_events (paddock_id, event_type, category, head_count, notes, date) VALUES (?,?,?,?,?,date(\'now\',\'localtime\'))',
        [Number(paddockId), eventType, category, count, notes]
      );
      const isAdd = eventType === 'NASCIMENTO' || eventType === 'COMPRA';
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM herd WHERE paddock_id=? AND category=?',
        [Number(paddockId), category]
      );
      if (existing) {
        if (isAdd) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id=?', [count, existing.id]);
        } else {
          await db.runAsync('UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE id=?', [count, existing.id]);
        }
      } else if (isAdd) {
        await db.runAsync(
          'INSERT INTO herd (paddock_id, category, head_count) VALUES (?,?,?)',
          [Number(paddockId), category, count]
        );
      }
      await db.runAsync('DELETE FROM herd WHERE head_count <= 0');
      Alert.alert('Sucesso', 'Evento registrado!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar evento');
    }
  }

  // No NASCIMENTO com VACA, mostrar só BEZERRO MAMANDO / BEZERRA MAMANDO.
  // Na MORTE, mostrar só categorias presentes.
  // Outros eventos: lista completa.
  let categoryOptions = CATTLE_CATEGORIES;
  if (eventType === 'NASCIMENTO' && hasVaca) {
    categoryOptions = CATTLE_CATEGORIES.filter((c) =>
      c.value === 'BEZERRO MAMANDO' || c.value === 'BEZERRA MAMANDO'
    );
  } else if (eventType === 'MORTE' && paddockCategories.length > 0) {
    categoryOptions = CATTLE_CATEGORIES.filter((c) => paddockCategories.includes(c.value));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Evento</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>TIPO DE EVENTO</Text>
        <MultiChoice options={EVENT_TYPES} value={eventType} onChange={(v) => { setEventType(v); setCategory(null); }} />

        <Text style={[styles.label, { marginTop: 20 }]}>PIQUETE</Text>
        <MultiChoice
          options={paddocks.map((p) => ({ value: String(p.id), label: p.name }))}
          value={paddockId}
          onChange={setPaddockId}
        />

        <Text style={[styles.label, { marginTop: 20 }]}>CATEGORIA</Text>
        {eventType === 'NASCIMENTO' && hasVaca && (
          <Text style={styles.hint}>Piquete tem VACAs — sugestão: bezerro/bezerra mamando.</Text>
        )}
        {eventType === 'MORTE' && paddockCategories.length === 0 && paddockId && (
          <Text style={styles.hint}>Piquete sem gado.</Text>
        )}
        <MultiChoice options={categoryOptions} value={category} onChange={setCategory} />

        <Text style={[styles.label, { marginTop: 20 }]}>QUANTIDADE</Text>
        <SliderInput value={count} onValueChange={setCount} min={1} max={100} step={1} unit="cab" color={Colors.primary} />

        <Text style={[styles.label, { marginTop: 20 }]}>OBSERVAÇÕES</Text>
        <TextInput
          style={styles.textarea}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anotações sobre o evento..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Button title="REGISTRAR EVENTO" onPress={handleSave} size="large" style={{ marginTop: 24 }} />
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
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: 8, fontStyle: 'italic' },
  textarea: { minHeight: 80, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 2, borderColor: '#e0dcd5', padding: 16, fontSize: 16 },
});
