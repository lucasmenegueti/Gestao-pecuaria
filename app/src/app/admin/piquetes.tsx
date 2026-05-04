import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, BrandHeader } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PaddockRow {
  id: number;
  name: string;
  area_hectares: number;
}

export default function PiquetesAdminScreen() {
  const db = useDatabase();
  const [paddocks, setPaddocks] = useState<PaddockRow[]>([]);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editOriginalName, setEditOriginalName] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const rows = await db.getAllAsync<PaddockRow>(
      `SELECT id, name, area_hectares FROM paddocks
        WHERE deleted_at IS NULL AND active = 1
        ORDER BY name`
    );
    setPaddocks(rows);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paddocks;
    return paddocks.filter((p) => p.name.toLowerCase().includes(q));
  }, [paddocks, query]);

  function openEdit(p: PaddockRow) {
    setEditId(p.id);
    setEditOriginalName(p.name);
    setName(p.name);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!editId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Erro', 'Nome não pode ficar vazio');
      return;
    }
    if (trimmed === editOriginalName) {
      setModalVisible(false);
      return;
    }
    // Coerência local: bloqueia duplicata. O constraint UNIQUE no Supabase fica
    // por conta do schema lá (não tem hoje, mas o UI manter consistente ajuda).
    const conflict = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM paddocks WHERE name = ? AND id != ? AND deleted_at IS NULL`,
      [trimmed, editId]
    );
    if (conflict) {
      Alert.alert('Nome em uso', `Já existe um piquete chamado "${trimmed}". Escolha outro nome.`);
      return;
    }
    setSaving(true);
    try {
      // O trigger tg_paddocks_mark_dirty seta pending_sync=1 — engine de push
      // sobe pro Supabase no próximo ciclo. Vide schema.ts MUTABLE_TABLES.
      await db.runAsync(`UPDATE paddocks SET name = ? WHERE id = ?`, [trimmed, editId]);
      setModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao salvar. Tente de novo.');
    }
    setSaving(false);
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Piquetes" context="Renomear identificadores" onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={styles.searchWrap}>
          <Search size={16} color={NSA.inkMuted} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar piquete (ex: T27, P11)"
            placeholderTextColor={NSA.inkDisabled}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.countText}>{filtered.length} de {paddocks.length} piquete{paddocks.length === 1 ? '' : 's'}</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.map((p) => (
            <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => openEdit(p)}>
              <Card>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemDetail}>{p.area_hectares.toFixed(2)} ha</Text>
                  </View>
                  <ChevronRight size={16} color={NSA.inkMuted} strokeWidth={1.75} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>Nenhum piquete corresponde a "{query}"</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Renomear piquete</Text>
            <Text style={styles.modalSubtitle}>Atual: {editOriginalName}</Text>
            <Text style={styles.label}>Novo nome</Text>
            <Text style={styles.hint}>Padrão sugerido: Txx - Pxx (talhão e piquete)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: T27 - P03"
              placeholderTextColor={NSA.inkDisabled}
              autoCorrect={false}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} disabled={saving} />
              <Button title={saving ? 'Salvando…' : 'Salvar'} onPress={handleSave} style={{ flex: 1 }} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: NSA.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: NSA.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: NSA.inkPrimary,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 15, fontFamily: Fonts.semibold, color: NSA.inkPrimary, letterSpacing: -0.15 },
  itemDetail: { fontSize: 12, color: NSA.inkSecondary, marginTop: 2, fontFamily: Fonts.regular },
  emptyText: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 32, fontFamily: Fonts.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,15,13,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: NSA.bgElevated, borderRadius: Radius.xl, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.loraSemibold, color: NSA.inkPrimary, marginBottom: 4, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, color: NSA.inkMuted, fontFamily: Fonts.regular, marginBottom: 14 },
  label: { fontSize: 12, fontFamily: Fonts.medium, color: NSA.inkSecondary, marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 11, color: NSA.inkMuted, fontFamily: Fonts.regular, marginBottom: 6 },
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
