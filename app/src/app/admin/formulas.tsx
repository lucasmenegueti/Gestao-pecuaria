import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, StatusPill, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';
import { sacos } from '@/constants';

interface FormulaRow {
  id: number;
  name: string;
  kg_per_sack: number;
  target_g_per_kg_body_day: number;
  active: number;
  min_sacks: number; // vem de inventory.min_sacks (location='central')
}

export default function FormulasScreen() {
  const db = useDatabase();
  const [formulas, setFormulas] = useState<FormulaRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kgPerSack, setKgPerSack] = useState('25');
  const [consumption, setConsumption] = useState('0.3');
  const [minSacks, setMinSacks] = useState('0');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    // Junta formula + min_sacks do estoque central (LEFT JOIN pra incluir
    // formulações que ainda não têm linha de inventory criada).
    const rows = await db.getAllAsync<FormulaRow>(
      `SELECT f.id, f.name, f.kg_per_sack, f.target_g_per_kg_body_day, f.active,
              COALESCE(i.min_sacks, 0) as min_sacks
         FROM formulas f
         LEFT JOIN inventory i ON i.formula_id = f.id AND i.location = 'central'
         ORDER BY f.active DESC, f.name`
    );
    setFormulas(rows);
  }

  function openNew() {
    setEditId(null);
    setName('');
    setKgPerSack('25');
    setConsumption('100');
    setMinSacks('0');
    setModalVisible(true);
  }

  function openEdit(f: FormulaRow) {
    setEditId(f.id);
    setName(f.name);
    setKgPerSack(String(f.kg_per_sack));
    setConsumption(String(f.target_g_per_kg_body_day));
    setMinSacks(String(f.min_sacks));
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Erro', 'Preencha o nome'); return; }
    const minSacksNum = Number(minSacks) || 0;
    try {
      let formulaId: number;
      if (editId) {
        await db.runAsync('UPDATE formulas SET name=?, kg_per_sack=?, target_g_per_kg_body_day=? WHERE id=?',
          [name.trim(), Number(kgPerSack), Number(consumption), editId]);
        formulaId = editId;
      } else {
        const res = await db.runAsync(
          'INSERT INTO formulas (name, kg_per_sack, target_g_per_kg_body_day) VALUES (?,?,?)',
          [name.trim(), Number(kgPerSack), Number(consumption)]
        );
        formulaId = Number(res.lastInsertRowId);
      }
      // min_sacks fica em inventory (location='central'). Cria linha se não existe.
      const inv = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM inventory WHERE formula_id=? AND location='central'",
        [formulaId]
      );
      if (inv) {
        await db.runAsync('UPDATE inventory SET min_sacks=? WHERE id=?', [minSacksNum, inv.id]);
      } else {
        await db.runAsync(
          "INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES (?,0,?, 'central')",
          [formulaId, minSacksNum]
        );
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
    <View style={styles.root}>
      <BrandHeader title="Formulações" context="Configurações" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {formulas.map((f) => (
            <Card key={f.id}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{f.name}</Text>
                <StatusPill kind={f.active ? 'ok' : 'neutral'}>{f.active ? 'Ativa' : 'Inativa'}</StatusPill>
              </View>
              <Text style={styles.itemDetail}>{f.kg_per_sack} kg por saco</Text>
              <Text style={styles.itemDetail}>Consumo alvo · {f.target_g_per_kg_body_day} g/kg PV/dia</Text>
              <Text style={styles.itemDetail}>Estoque mínimo · {sacos(f.min_sacks)}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEdit(f)} style={styles.actionLink}>
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(f)} style={styles.actionLink}>
                  <Text style={[styles.actionText, { color: f.active ? NSA.danger : NSA.ok }]}>
                    {f.active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          <Button title="Nova formulação" onPress={openNew} style={{ marginTop: 8 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Editar formulação' : 'Nova formulação'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Sal mineral" placeholderTextColor={NSA.inkDisabled} />
            <Text style={styles.label}>Kg por saco</Text>
            <TextInput style={styles.input} value={kgPerSack} onChangeText={setKgPerSack} keyboardType="numeric" />
            <Text style={styles.label}>Consumo alvo (g/kg peso vivo/dia)</Text>
            <Text style={styles.hint}>Ex.: sal mineral 0.1 · proteinado 0.4 · engorda 7–10</Text>
            <TextInput style={styles.input} value={consumption} onChangeText={setConsumption} keyboardType="numeric" />
            <Text style={styles.label}>Estoque mínimo (sacos)</Text>
            <Text style={styles.hint}>Dispara alerta no Painel quando cai abaixo</Text>
            <TextInput style={styles.input} value={minSacks} onChangeText={setMinSacks} keyboardType="numeric" />
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
  hint: { fontSize: 11, color: NSA.inkMuted, fontFamily: Fonts.regular, marginBottom: 4 },
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
