import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants';

interface FormulaRow {
  id: number;
  name: string;
  kg_per_sack: number;
  target_consumption_g_per_day: number;
  active: number;
}

export default function FormulasScreen() {
  const db = useDatabase();
  const [formulas, setFormulas] = useState<FormulaRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kgPerSack, setKgPerSack] = useState('25');
  const [consumption, setConsumption] = useState('100');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const rows = await db.getAllAsync<FormulaRow>('SELECT * FROM formulas ORDER BY active DESC, name');
    setFormulas(rows);
  }

  function openNew() {
    setEditId(null);
    setName('');
    setKgPerSack('25');
    setConsumption('100');
    setModalVisible(true);
  }

  function openEdit(f: FormulaRow) {
    setEditId(f.id);
    setName(f.name);
    setKgPerSack(String(f.kg_per_sack));
    setConsumption(String(f.target_consumption_g_per_day));
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Erro', 'Preencha o nome'); return; }
    try {
      if (editId) {
        await db.runAsync('UPDATE formulas SET name=?, kg_per_sack=?, target_consumption_g_per_day=? WHERE id=?',
          [name.trim(), Number(kgPerSack), Number(consumption), editId]);
      } else {
        await db.runAsync('INSERT INTO formulas (name, kg_per_sack, target_consumption_g_per_day) VALUES (?,?,?)',
          [name.trim(), Number(kgPerSack), Number(consumption)]);
      }
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
  }

  async function toggleActive(f: FormulaRow) {
    await db.runAsync('UPDATE formulas SET active=? WHERE id=?', [f.active ? 0 : 1, f.id]);
    load();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formulações</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Formulações</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => router.replace('/admin/grass-types')}>
          <Text style={styles.tabText}>Tipos de Capim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {formulas.map((f) => (
          <Card key={f.id}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{f.name.toUpperCase()}</Text>
              <Badge label={f.active ? 'Ativa' : 'Inativa'} variant={f.active ? 'ok' : 'muted'} />
            </View>
            <Text style={styles.itemDetail}>{f.kg_per_sack} kg por saco</Text>
            <Text style={styles.itemDetail}>Consumo alvo: {f.target_consumption_g_per_day} g/cab/dia</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => openEdit(f)} style={styles.actionLink}>
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleActive(f)} style={styles.actionLink}>
                <Text style={[styles.actionText, { color: f.active ? Colors.danger : Colors.success }]}>
                  {f.active ? 'Desativar' : 'Ativar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
        <Button title="NOVA FORMULAÇÃO" onPress={openNew} size="large" style={{ marginTop: 8 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Editar Formulação' : 'Nova Formulação'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Sal Mineral" />
            <Text style={styles.label}>Kg por saco</Text>
            <TextInput style={styles.input} value={kgPerSack} onChangeText={setKgPerSack} keyboardType="numeric" />
            <Text style={styles.label}>Consumo alvo (g/cab/dia)</Text>
            <TextInput style={styles.input} value={consumption} onChangeText={setConsumption} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <Button title="CANCELAR" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="SALVAR" onPress={handleSave} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ec' },
  header: { backgroundColor: '#1a6b54', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  back: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  tabRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0dcd5' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#1a6b54' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#7a7a7a' },
  tabTextActive: { color: '#1a6b54' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: '800', color: '#2c2c2c' },
  itemDetail: { fontSize: 14, color: '#7a7a7a', marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionLink: { paddingVertical: 4 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#1a6b54' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#2c2c2c', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#2c2c2c', marginBottom: 4, marginTop: 12 },
  input: { height: 48, borderWidth: 2, borderColor: '#e0dcd5', borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
