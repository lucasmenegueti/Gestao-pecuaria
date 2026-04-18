import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, Badge } from '@/components/ui';
import { Colors } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GrassRow {
  id: number;
  name: string;
  entry_height_cm: number;
  exit_height_cm: number;
  active: number;
}

export default function GrassTypesScreen() {
  const db = useDatabase();
  const [types, setTypes] = useState<GrassRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [entry, setEntry] = useState('40');
  const [exit, setExit] = useState('20');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const rows = await db.getAllAsync<GrassRow>('SELECT * FROM grass_types ORDER BY active DESC, name');
    setTypes(rows);
  }

  function openNew() {
    setEditId(null); setName(''); setEntry('40'); setExit('20'); setModalVisible(true);
  }

  function openEdit(g: GrassRow) {
    setEditId(g.id); setName(g.name); setEntry(String(g.entry_height_cm)); setExit(String(g.exit_height_cm)); setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Erro', 'Preencha o nome'); return; }
    try {
      if (editId) {
        await db.runAsync('UPDATE grass_types SET name=?, entry_height_cm=?, exit_height_cm=? WHERE id=?',
          [name.trim(), Number(entry), Number(exit), editId]);
      } else {
        await db.runAsync('INSERT INTO grass_types (name, entry_height_cm, exit_height_cm) VALUES (?,?,?)',
          [name.trim(), Number(entry), Number(exit)]);
      }
      setModalVisible(false); load();
    } catch (err) { Alert.alert('Erro', 'Falha ao salvar'); }
  }

  async function toggleActive(g: GrassRow) {
    await db.runAsync('UPDATE grass_types SET active=? WHERE id=?', [g.active ? 0 : 1, g.id]);
    load();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tipos de Capim</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tab} onPress={() => router.replace('/admin/formulas')}>
          <Text style={styles.tabText}>Formulações</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Tipos de Capim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {types.map((g) => (
          <Card key={g.id}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{g.name.toUpperCase()}</Text>
              <Badge label={g.active ? 'Ativo' : 'Inativo'} variant={g.active ? 'ok' : 'muted'} />
            </View>
            <Text style={styles.itemDetail}>Entrada ideal: ≥{g.entry_height_cm} cm</Text>
            <Text style={styles.itemDetail}>Saída ideal: ≥{g.exit_height_cm} cm</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => openEdit(g)} style={styles.actionLink}>
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleActive(g)} style={styles.actionLink}>
                <Text style={[styles.actionText, { color: g.active ? Colors.danger : Colors.success }]}>
                  {g.active ? 'Desativar' : 'Ativar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
        <Button title="NOVO TIPO DE CAPIM" onPress={openNew} size="large" style={{ marginTop: 8 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Editar Tipo' : 'Novo Tipo de Capim'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Mombaça" />
            <Text style={styles.label}>Altura entrada ideal (cm)</Text>
            <TextInput style={styles.input} value={entry} onChangeText={setEntry} keyboardType="numeric" />
            <Text style={styles.label}>Altura saída ideal (cm)</Text>
            <TextInput style={styles.input} value={exit} onChangeText={setExit} keyboardType="numeric" />
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
