import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Plus, Minus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Button, MultiChoice, SliderInput, BrandHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { NSA, Fonts, Radius } from '@/theme/nsa';

type Mode = 'add' | 'remove';

interface Item {
  id: number;
  formula_id: number;
  name: string;
  qty: number;
}

export default function AjusteEstoqueScreen() {
  const db = useDatabase();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<Mode>('remove');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, [mode]);

  async function loadItems() {
    // Modo "add" mostra todas as fórmulas ativas (inclusive sem inventory row).
    // Modo "remove" só mostra o que tem saldo na central.
    if (mode === 'remove') {
      const rows = await db.getAllAsync<{ id: number; formula_id: number; name: string; quantity_sacks: number }>(
        "SELECT i.id, i.formula_id, f.name, i.quantity_sacks FROM inventory i JOIN formulas f ON f.id=i.formula_id WHERE i.location='central' AND i.quantity_sacks > 0"
      );
      setItems(rows.map((r) => ({ id: r.id, formula_id: r.formula_id, name: r.name, qty: r.quantity_sacks })));
    } else {
      const rows = await db.getAllAsync<{ formula_id: number; name: string; qty: number | null; inv_id: number | null }>(
        `SELECT f.id as formula_id, f.name,
           (SELECT i.quantity_sacks FROM inventory i WHERE i.formula_id = f.id AND i.location='central' LIMIT 1) as qty,
           (SELECT i.id FROM inventory i WHERE i.formula_id = f.id AND i.location='central' LIMIT 1) as inv_id
         FROM formulas f WHERE f.active = 1 ORDER BY f.name`
      );
      setItems(rows.map((r) => ({
        id: r.inv_id ?? 0,
        formula_id: r.formula_id,
        name: r.name,
        qty: r.qty ?? 0,
      })));
    }
  }

  const selected = items.find((i) => String(i.formula_id) === selectedId);
  const maxRemove = selected ? Math.max(selected.qty, 1) : 1;
  const effectiveMax = mode === 'remove' ? maxRemove : 200;

  // Clamp ao alternar produto ou modo.
  useEffect(() => {
    if (quantity > effectiveMax) setQuantity(effectiveMax);
    if (quantity < 1) setQuantity(1);
  }, [selectedId, mode, effectiveMax]);

  async function handleSave() {
    if (!selected) {
      Alert.alert('Erro', 'Selecione um produto');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do ajuste (obrigatório p/ relatório).');
      return;
    }
    if (mode === 'remove' && quantity > selected.qty) {
      Alert.alert('Erro', `Só ${selected.qty} sacos disponíveis. Reduza a quantidade.`);
      return;
    }
    setSaving(true);
    try {
      const delta = mode === 'add' ? quantity : -quantity;
      const eventType = mode === 'add' ? 'AJUSTE_GANHO_CENTRAL' : 'AJUSTE_PERDA_CENTRAL';

      if (selected.id > 0) {
        await db.runAsync(
          mode === 'add'
            ? 'UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE id=?'
            : 'UPDATE inventory SET quantity_sacks = MAX(0, quantity_sacks - ?) WHERE id=?',
          [quantity, selected.id]
        );
      } else {
        // Primeira entrada para essa fórmula — cria a row.
        await db.runAsync(
          "INSERT INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES (?,?,0,'central')",
          [selected.formula_id, quantity]
        );
      }
      await db.runAsync(
        `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
         VALUES (?, ?, NULL, ?, ?, ?)`,
        [eventType, selected.formula_id, delta, reason.trim(), user?.id ?? null]
      );
      const msg = mode === 'add'
        ? `+${quantity} saco(s) adicionados.`
        : `${quantity} saco(s) removidos (perda).`;
      Alert.alert('Registrado', msg, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao registrar ajuste');
    }
    setSaving(false);
  }

  const isAdd = mode === 'add';
  const accentColor = isAdd ? NSA.ok : NSA.danger;
  const contextLabel = isAdd ? 'Estoque · Entrada' : 'Estoque · Perda';

  return (
    <View style={styles.root}>
      <BrandHeader title="Ajuste manual" context={contextLabel} onBack={() => router.back()} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, isAdd && styles.modeBtnActiveAdd]}
              onPress={() => setMode('add')}
              activeOpacity={0.85}
            >
              <Plus size={14} color={isAdd ? NSA.ok : NSA.inkMuted} strokeWidth={2} />
              <Text style={[styles.modeText, isAdd && { color: NSA.ok, fontFamily: Fonts.semibold }]}>Adicionar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, !isAdd && styles.modeBtnActiveRemove]}
              onPress={() => setMode('remove')}
              activeOpacity={0.85}
            >
              <Minus size={14} color={!isAdd ? NSA.danger : NSA.inkMuted} strokeWidth={2} />
              <Text style={[styles.modeText, !isAdd && { color: NSA.danger, fontFamily: Fonts.semibold }]}>Remover</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warnBox}>
            <View style={styles.warnHeader}>
              <AlertTriangle size={14} color={NSA.warnFg} strokeWidth={1.75} />
              <Text style={styles.warnTitle}>ATENÇÃO</Text>
            </View>
            <Text style={styles.warnText}>
              Diferenças positivas ou negativas são contabilizadas no inventário e
              registradas no relatório. Use só para divergência, perda, desvio ou
              entrada fora do fluxo padrão (entrada normal via {''}
              <Text style={{ fontFamily: Fonts.semibold }}>Entrada de estoque</Text>).
            </Text>
          </View>

          <Text style={styles.label}>PRODUTO</Text>
          {items.length === 0 ? (
            <Text style={styles.empty}>
              {isAdd ? 'Cadastre uma fórmula em Admin primeiro.' : 'Nenhum produto com saldo na central.'}
            </Text>
          ) : (
            <MultiChoice
              options={items.map((i) => ({
                value: String(i.formula_id),
                label: i.name,
                description: `Central · ${i.qty} saco${i.qty === 1 ? '' : 's'}`,
              }))}
              value={selectedId}
              onChange={setSelectedId}
            />
          )}

          <Text style={[styles.label, { marginTop: 22 }]}>
            {isAdd ? 'QUANTIDADE A ADICIONAR' : 'QUANTIDADE A REMOVER'}
          </Text>
          <SliderInput
            value={quantity}
            onValueChange={setQuantity}
            min={1}
            max={effectiveMax}
            step={1}
            unit="sacos"
            color={accentColor}
          />

          <Text style={[styles.label, { marginTop: 22 }]}>MOTIVO</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder={isAdd
              ? 'Ex.: recontagem achou 3 sacos a mais, doação, etc.'
              : 'Ex.: recontagem diff 3 sacos, rasgo, etc.'}
            multiline
            placeholderTextColor={NSA.inkDisabled}
          />
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button
            title={saving
              ? 'Registrando…'
              : isAdd
                ? `Registrar entrada · ${quantity} sacos`
                : `Registrar perda · ${quantity} sacos`}
            variant={isAdd ? 'primary' : 'danger'}
            onPress={handleSave}
            disabled={saving || !selected}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    backgroundColor: NSA.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NSA.border,
    backgroundColor: NSA.bgElevated,
  },
  modeBtnActiveAdd: { borderColor: NSA.ok, backgroundColor: NSA.okBg },
  modeBtnActiveRemove: { borderColor: NSA.danger, backgroundColor: NSA.dangerBg },
  modeText: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkMuted },
  warnBox: {
    backgroundColor: NSA.warnBg,
    borderLeftWidth: 3,
    borderLeftColor: NSA.warn,
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 18,
  },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  warnTitle: { fontSize: 11, fontFamily: Fonts.medium, letterSpacing: 1.2, color: NSA.warnFg },
  warnText: { fontSize: 12, color: NSA.inkPrimary, lineHeight: 17, fontFamily: Fonts.regular },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 10,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: NSA.inkPrimary,
    backgroundColor: NSA.bgElevated,
    textAlignVertical: 'top',
  },
  empty: {
    fontSize: 13,
    color: NSA.inkMuted,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 18,
    fontStyle: 'italic',
  },
});
