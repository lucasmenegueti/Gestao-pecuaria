import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, X, Plus, Search } from 'lucide-react-native';
import { useDatabase } from '@/lib/db/provider';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, StatusPill, BrandHeader, KeyboardAvoider } from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';
import {
  listPendingRequests, createRequest, cancelRequest,
  listPaddocksForPicker, EVAL_KINDS, EVAL_KIND_LABELS,
  type EvalKind, type InspectionRequest,
} from '@/lib/inspection-requests';
import { formatDayMonth } from '@/lib/dates';

export default function SolicitacoesScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [paddocks, setPaddocks] = useState<Array<{ id: number; name: string }>>([]);
  const [paddockSearch, setPaddockSearch] = useState('');
  const [selectedPaddockIds, setSelectedPaddockIds] = useState<Set<number>>(new Set());
  const [selectedKinds, setSelectedKinds] = useState<Set<EvalKind>>(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setRequests(await listPendingRequests(db));
  }

  async function openNew() {
    const ps = await listPaddocksForPicker(db);
    setPaddocks(ps);
    setSelectedPaddockIds(new Set());
    setSelectedKinds(new Set());
    setPaddockSearch('');
    setNotes('');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!user) return;
    if (selectedPaddockIds.size === 0) { Alert.alert('Erro', 'Escolha pelo menos um piquete'); return; }
    if (selectedKinds.size === 0) { Alert.alert('Erro', 'Escolha pelo menos uma inspeção'); return; }
    setSaving(true);
    try {
      const trimmed = notes.trim() || null;
      for (const paddockId of selectedPaddockIds) {
        for (const kind of selectedKinds) {
          await createRequest(db, paddockId, kind, user.id, trimmed);
        }
      }
      setModalVisible(false);
      await load();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao salvar solicitações');
    }
    setSaving(false);
  }

  function togglePaddock(id: number) {
    setSelectedPaddockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPaddocks() {
    setSelectedPaddockIds((prev) => {
      // Se todos os filtrados já estão marcados, desmarca tudo. Senão marca todos os filtrados.
      const allSelected = filteredPaddocks.every((p) => prev.has(p.id));
      const next = new Set(prev);
      if (allSelected) {
        for (const p of filteredPaddocks) next.delete(p.id);
      } else {
        for (const p of filteredPaddocks) next.add(p.id);
      }
      return next;
    });
  }

  async function handleCancel(req: InspectionRequest) {
    Alert.alert(
      'Cancelar solicitação',
      `${req.paddock_name} · ${EVAL_KIND_LABELS[req.eval_kind]}`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar', style: 'destructive', onPress: async () => {
            await cancelRequest(db, req.id);
            await load();
          },
        },
      ]
    );
  }

  // Agrupa por piquete pra UI mais limpa
  const byPaddock = requests.reduce<Record<string, { paddockId: number; paddockName: string; items: InspectionRequest[] }>>((acc, r) => {
    const k = String(r.paddock_id);
    if (!acc[k]) acc[k] = { paddockId: r.paddock_id, paddockName: r.paddock_name, items: [] };
    acc[k].items.push(r);
    return acc;
  }, {});

  const filteredPaddocks = paddockSearch
    ? paddocks.filter((p) => p.name.toLowerCase().includes(paddockSearch.toLowerCase()))
    : paddocks;

  function toggleKind(k: EvalKind) {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <BrandHeader
        title="Solicitações"
        context={`${requests.length} pendente${requests.length === 1 ? '' : 's'}`}
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={openNew} hitSlop={8} style={styles.addBtn}>
            <Plus size={20} color={NSA.cream} strokeWidth={2} />
          </TouchableOpacity>
        }
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {requests.length === 0 ? (
            <View style={styles.empty}>
              <StatusPill kind="ok">Sem solicitações pendentes</StatusPill>
              <Text style={styles.emptyHint}>
                Toque em + pra delegar uma inspeção sob demanda a um piquete.
              </Text>
            </View>
          ) : (
            Object.values(byPaddock).map((group) => (
              <View key={group.paddockId} style={styles.group}>
                <Text style={styles.groupTitle}>{group.paddockName}</Text>
                {group.items.map((req) => (
                  <TouchableOpacity
                    key={req.id}
                    activeOpacity={0.85}
                    onPress={() => handleCancel(req)}
                    style={styles.row}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{EVAL_KIND_LABELS[req.eval_kind]}</Text>
                      <Text style={styles.rowMeta}>
                        Criada {formatDayMonth(req.created_at)}
                        {req.notes ? ` · ${req.notes}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.cancelLink}>Cancelar</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal de criação */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoider style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova solicitação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <X size={20} color={NSA.inkPrimary} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  Piquetes{selectedPaddockIds.size > 0 ? ` · ${selectedPaddockIds.size} marcado${selectedPaddockIds.size === 1 ? '' : 's'}` : ''}
                </Text>
                <TouchableOpacity onPress={toggleAllPaddocks} hitSlop={8}>
                  <Text style={styles.linkAction}>
                    {filteredPaddocks.every((p) => selectedPaddockIds.has(p.id)) && filteredPaddocks.length > 0
                      ? 'Limpar'
                      : 'Marcar todos'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBar}>
                <Search size={14} color={NSA.inkMuted} strokeWidth={1.75} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar piquete"
                  value={paddockSearch}
                  onChangeText={setPaddockSearch}
                  placeholderTextColor={NSA.inkDisabled}
                />
              </View>
              <View style={styles.paddockList}>
                {filteredPaddocks.map((p) => {
                  const selected = selectedPaddockIds.has(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.paddockChip, selected && styles.paddockChipSelected]}
                      onPress={() => togglePaddock(p.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.paddockChipText, selected && styles.paddockChipTextSelected]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Inspeções</Text>
              <View style={styles.kindList}>
                {EVAL_KINDS.map((k) => {
                  const selected = selectedKinds.has(k);
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.kindChip, selected && styles.kindChipSelected]}
                      onPress={() => toggleKind(k)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                        {EVAL_KIND_LABELS[k]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Notas (opcional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Algo específico pra observar?"
                placeholderTextColor={NSA.inkDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" onPress={() => setModalVisible(false)} variant="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={saving ? 'Salvando…' : 'Solicitar'} onPress={handleSave} disabled={saving} />
              </View>
            </View>
          </View>
        </KeyboardAvoider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,227,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  empty: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 16,
    alignItems: 'flex-start',
    gap: 10,
  },
  emptyHint: {
    fontSize: 12,
    color: NSA.inkMuted,
    fontFamily: Fonts.regular,
  },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.border,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.15,
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: NSA.inkMuted,
    marginTop: 2,
  },
  cancelLink: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: NSA.dangerFg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: NSA.bg,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: NSA.inkPrimary,
    letterSpacing: -0.2,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  linkAction: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: NSA.green800,
    textDecorationLine: 'underline',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: NSA.inkPrimary,
    fontFamily: Fonts.regular,
  },
  paddockList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paddockChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  paddockChipSelected: {
    backgroundColor: NSA.green800,
    borderColor: NSA.green800,
  },
  paddockChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: NSA.inkPrimary,
  },
  paddockChipTextSelected: {
    color: NSA.cream,
  },
  kindList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  kindChipSelected: {
    backgroundColor: NSA.warnBg,
    borderColor: NSA.warn,
  },
  kindChipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: NSA.inkPrimary,
  },
  kindChipTextSelected: {
    color: NSA.warnFg,
  },
  textArea: {
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.md,
    padding: 10,
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 13,
    color: NSA.inkPrimary,
    fontFamily: Fonts.regular,
  },
});
