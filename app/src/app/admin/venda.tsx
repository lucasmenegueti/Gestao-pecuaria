import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, SliderInput, SummaryRow, BrandHeader, KeyboardAvoider} from '@/components/ui';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PoolCat {
  category: string;
  total: number;
}

/**
 * Venda é aplicada no gado desalocado (pool). Grava em herd_events com
 * event_type='VENDA', weight_kg (peso médio de balança ou estimado) e
 * decrementa o pool. Preserva supabase_id (head_count=0 em vez de DELETE)
 * pra sync aplicar UPDATE remoto em vez de duplicar via INSERT.
 */
export default function VendaScreen() {
  const db = useDatabase();
  const [pool, setPool] = useState<PoolCat[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [weightKg, setWeightKg] = useState(450);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { loadPool(); }, []);

  async function loadPool() {
    const rows = await db.getAllAsync<PoolCat>(
      'SELECT category, SUM(head_count) AS total FROM herd WHERE paddock_id IS NULL AND head_count > 0 GROUP BY category'
    );
    setPool(rows);
  }

  function setAmount(cat: string, v: number) {
    setAmounts((p) => ({ ...p, [cat]: v }));
  }
  function fillAll() {
    const filled: Record<string, number> = {};
    for (const c of pool) filled[c.category] = c.total;
    setAmounts(filled);
  }
  function clearAll() {
    setAmounts({});
  }

  const selectedEntries = Object.entries(amounts).filter(([, v]) => v > 0);
  const selectedTotal = selectedEntries.reduce((s, [, v]) => s + v, 0);

  function goToReview() {
    if (selectedTotal === 0) return;
    setReviewing(true);
  }

  async function handleConfirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      for (const [cat, qty] of selectedEntries) {
        // Drena da pool
        await db.runAsync(
          'UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE paddock_id IS NULL AND category = ?',
          [qty, cat]
        );
        // Registra evento — weight_kg é peso médio por cabeça nessa venda
        await db.runAsync(
          `INSERT INTO herd_events (paddock_id, event_type, category, head_count, weight_kg, date)
           VALUES (NULL, 'VENDA', ?, ?, ?, date('now','localtime'))`,
          [cat, qty, weightKg]
        );
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/rebanho');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao registrar venda.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (pool.length === 0) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Vender gado" context="Rebanho · Desalocados" onBack={() => router.back()} />
        <Text style={styles.empty}>Sem gado desalocado pra vender. Desaloca primeiro pelo pool.</Text>
      </View>
    );
  }

  if (reviewing) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Confirmar venda" context="Rebanho" onBack={() => setReviewing(false)} />
        <KeyboardAvoider>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Card borderColor={NSA.warn}>
              {selectedEntries.map(([cat, qty]) => (
                <SummaryRow key={cat} label={cat} value={`${qty} cab`} />
              ))}
              <SummaryRow label="Total" value={`${selectedTotal} cab`} valueColor={NSA.warnFg} />
              <SummaryRow label="Peso médio (balança/estimado)" value={`${weightKg} kg`} />
              <SummaryRow label="Peso total" value={`${(weightKg * selectedTotal).toLocaleString('pt-BR')} kg`} valueColor={NSA.inkPrimary} />
              <Text style={styles.note}>
                Essas cabeças saem do inventário (pool de desalocados). O evento fica guardado pra relatório de vendas.
              </Text>
            </Card>
            <Button
              title={submitting ? 'Processando…' : 'Confirmar venda'}
              onPress={handleConfirm}
              disabled={submitting}
              
              style={{ marginTop: 14 }}
            />
            <Button
              title="Voltar e ajustar"
              variant="outline"
              onPress={() => setReviewing(false)}
              disabled={submitting}
              style={{ marginTop: 10 }}
            />
          </ScrollView>
        </SafeAreaView>
        </KeyboardAvoider>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Vender gado" context="Rebanho · Desalocados" onBack={() => router.back()} />
      <KeyboardAvoider>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>QUANTIDADE POR CATEGORIA</Text>
          <Text style={styles.sublabel}>
            {pool.reduce((s, p) => s + p.total, 0)} cab desalocadas disponíveis
          </Text>

          <View style={styles.bulkRow}>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnPrimary]} onPress={fillAll} activeOpacity={0.85}>
              <Text style={[styles.bulkBtnText, styles.bulkBtnTextPrimary]}>Vender tudo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnMuted]} onPress={clearAll} activeOpacity={0.85}>
              <Text style={[styles.bulkBtnText, styles.bulkBtnTextMuted]}>Zerar</Text>
            </TouchableOpacity>
          </View>

          {pool.map((c) => (
            <Card key={c.category}>
              <Text style={styles.catTitle}>
                {c.category} · disponível {c.total}
              </Text>
              <SliderInput
                value={amounts[c.category] ?? 0}
                onValueChange={(v) => setAmount(c.category, v)}
                min={0}
                max={c.total}
                step={1}
                unit="cab"
              />
            </Card>
          ))}

          <Text style={[styles.label, { marginTop: 22 }]}>PESO MÉDIO POR CABEÇA</Text>
          <Text style={styles.sublabel}>Balança se pesou, senão estimado</Text>
          <Card>
            <SliderInput
              value={weightKg}
              onValueChange={setWeightKg}
              min={50}
              max={700}
              step={5}
              unit="kg"
            />
          </Card>

          <Button
            title={selectedTotal === 0 ? 'Selecione quantidade' : `Revisar · ${selectedTotal} cab × ${weightKg} kg`}
            onPress={goToReview}
            disabled={selectedTotal === 0}
            style={{ marginTop: 14 }}
          />
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  empty: { fontSize: 14, color: NSA.inkMuted, textAlign: 'center', marginTop: 60, fontFamily: Fonts.regular },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: NSA.inkMuted,
    marginBottom: 2,
  },
  sublabel: { fontSize: 12, color: NSA.inkMuted, marginBottom: 12, fontFamily: Fonts.regular },
  bulkRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bulkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  bulkBtnPrimary: { borderColor: NSA.warn, backgroundColor: NSA.warnBg },
  bulkBtnMuted: { borderColor: NSA.borderStrong, backgroundColor: NSA.bgElevated },
  bulkBtnText: { fontSize: 13, fontFamily: Fonts.semibold },
  bulkBtnTextPrimary: { color: NSA.warnFg },
  bulkBtnTextMuted: { color: NSA.inkSecondary },
  catTitle: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  note: { fontSize: 12, color: NSA.inkSecondary, marginTop: 12, lineHeight: 17, fontFamily: Fonts.regular },
});
