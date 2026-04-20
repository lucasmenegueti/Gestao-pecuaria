import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, StatusPill, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

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
    <View style={styles.root}>
      <BrandHeader title="Tipos de capim" context="Configurações" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {types.map((g) => (
            <Card key={g.id}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{g.name}</Text>
                <StatusPill kind={g.active ? 'ok' : 'neutral'}>{g.active ? 'Ativo' : 'Inativo'}</StatusPill>
              </View>
              <Text style={styles.itemDetail}>Entrada ideal · ≥ {g.entry_height_cm} cm</Text>
              <Text style={styles.itemDetail}>Saída ideal · ≥ {g.exit_height_cm} cm</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEdit(g)} style={styles.actionLink}>
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(g)} style={styles.actionLink}>
                  <Text style={[styles.actionText, { color: g.active ? NSA.danger : NSA.ok }]}>
                    {g.active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          <Button title="Novo tipo de capim" onPress={openNew} style={{ marginTop: 8 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Editar tipo' : 'Novo tipo de capim'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Mombaça" placeholderTextColor={NSA.inkDisabled} />
            <Text style={styles.label}>Altura entrada ideal (cm)</Text>
            <TextInput style={styles.input} value={entry} onChangeText={setEntry} keyboardType="numeric" />
            <Text style={styles.label}>Altura saída ideal (cm)</Text>
            <TextInput style={styles.input} value={exit} onChangeText={setExit} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Salvar" onPress={handleSave} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 15, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemDetail: { fontSize: 13, color: NSA.inkSecondary, marginTop: 2, fontFamily: Fonts.regular },
  itemActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionLink: { paddingVertical: 4 },
  actionText: { fontSize: 13, fontFamily: Fonts.semibold, color: NSA.green800 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,15,13,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: NSA.bgElevated, borderRadius: Radius.xl, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.loraSemibold, color: NSA.inkPrimary, marginBottom: 14, letterSpacing: -0.3 },
  label: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.inkSecondary, marginBottom: 4, marginTop: 12 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: NSA.inkPrimary,
    backgroundColor: NSA.bgElevated,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
