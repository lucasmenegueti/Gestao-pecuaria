import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Search, X, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/lib/db/provider';
import { Card, Button, MultiChoice, SliderInput, BrandHeader } from '@/components/ui';
import { PAIR_CATEGORIES } from '@/constants';
import { NSA, Fonts, Radius } from '@/theme/nsa';

interface PoolCat {
  category: string;
  total: number;
}

interface PaddockOption {
  id: number;
  name: string;
  area: number;
  current_heads: number;
  current_categories: string;
}

export default function AlocarScreen() {
  const db = useDatabase();
  const [pool, setPool] = useState<PoolCat[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [paddocks, setPaddocks] = useState<PaddockOption[]>([]);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    db.getAllAsync<PoolCat>(
      'SELECT category, SUM(head_count) AS total FROM herd WHERE paddock_id IS NULL GROUP BY category'
    ).then((rows) => {
      setPool(rows);
      setAmounts(Object.fromEntries(rows.map((r) => [r.category, 0])));
    });

    db.getAllAsync<PaddockOption>(`
      SELECT p.id, p.name, p.area_hectares AS area,
        COALESCE(SUM(h.head_count), 0) AS current_heads,
        COALESCE(GROUP_CONCAT(h.category, ', '), '') AS current_categories
      FROM paddocks p
      LEFT JOIN herd h ON h.paddock_id = p.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.name
    `).then(setPaddocks);
  }, []);

  function setAmount(cat: string, v: number) {
    setAmounts((prev) => ({ ...prev, [cat]: v }));
  }

  function fillAll() {
    setAmounts(Object.fromEntries(pool.map((p) => [p.category, p.total])));
  }

  function clearAll() {
    setAmounts(Object.fromEntries(pool.map((p) => [p.category, 0])));
  }

  const selected = Object.entries(amounts).filter(([, v]) => v > 0);
  const selectedTotal = selected.reduce((s, [, v]) => s + v, 0);
  const selectedCats = selected.map(([c]) => c);
  const nonPairMix = selectedCats.length > 1 && !selectedCats.every((c) => PAIR_CATEGORIES.has(c));

  async function handleConfirm() {
    if (!destinoId || selected.length === 0) {
      Alert.alert('Erro', 'Selecione quantidades e piquete destino.');
      return;
    }
    if (nonPairMix) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Atenção',
          'Você está alocando categorias diferentes que não são vaca+bezerro mamando. Continuar?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continuar', onPress: () => resolve(true) },
          ]
        );
      });
      if (!ok) return;
    }
    if (submittingRef.current) {
      console.warn('[alocar] handleConfirm já em andamento — ignorando double-tap');
      return;
    }
    submittingRef.current = true;
    try {
      for (const [cat, qty] of selected) {
        // Decrementa pool
        const poolRow = await db.getFirstAsync<{ id: number; head_count: number }>(
          'SELECT id, head_count FROM herd WHERE paddock_id IS NULL AND category = ?',
          [cat]
        );
        if (!poolRow || poolRow.head_count < qty) {
          throw new Error(`Pool insuficiente para ${cat}`);
        }
        await db.runAsync('UPDATE herd SET head_count = MAX(0, head_count - ?) WHERE id = ?', [qty, poolRow.id]);
        // Upsert no destino
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM herd WHERE paddock_id = ? AND category = ?',
          [Number(destinoId), cat]
        );
        if (existing) {
          await db.runAsync('UPDATE herd SET head_count = head_count + ? WHERE id = ?', [qty, existing.id]);
        } else {
          await db.runAsync(
            'INSERT INTO herd (paddock_id, category, head_count) VALUES (?, ?, ?)',
            [Number(destinoId), cat, qty]
          );
        }
        // Evento
        await db.runAsync(
          'INSERT INTO herd_events (paddock_id, event_type, category, head_count, target_paddock_id, date) VALUES (NULL, ?, ?, ?, ?, date(\'now\',\'localtime\'))',
          ['ALOCACAO', cat, qty, Number(destinoId)]
        );
      }
      // NÃO deletar rows com head_count=0 — preserva supabase_id pra sync UPDATE
      // em vez de INSERT (que daria UNIQUE violation e duplicar via heal).
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/rebanho');
      }
    } catch (err: any) {
      console.error('[alocar] falha', err);
      Alert.alert('Erro', err?.message || 'Falha ao alocar.');
    } finally {
      submittingRef.current = false;
    }
  }

  if (pool.length === 0) {
    return (
      <View style={styles.root}>
        <BrandHeader title="Alocar em piquete" context="Rebanho" onBack={() => router.back()} />
        <Text style={styles.empty}>Não há gado desalocado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BrandHeader title="Alocar em piquete" context="Rebanho" onBack={() => router.back()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>COMPOSIÇÃO DO LOTE (da pool)</Text>
        <Text style={styles.sublabel}>
          {pool.reduce((s, p) => s + p.total, 0)} cab desalocadas disponíveis
        </Text>

        <View style={styles.bulkRow}>
          <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnPrimary]} onPress={fillAll} activeOpacity={0.85}>
            <Text style={[styles.bulkBtnText, styles.bulkBtnTextPrimary]}>Selecionar tudo</Text>
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

        <Card>
          <Text style={styles.summaryText}>
            Total a alocar · <Text style={styles.summaryBold}>{selectedTotal} cab</Text>
          </Text>
          {nonPairMix && (
            <View style={styles.warnRow}>
              <AlertTriangle size={14} color={NSA.warnFg} strokeWidth={1.75} />
              <Text style={styles.warnText}>
                Mistura de categorias não-par. Piquete geralmente tem 1 categoria.
              </Text>
            </View>
          )}
        </Card>

        <Text style={[styles.label, { marginTop: 22 }]}>PIQUETE DESTINO</Text>

        <View style={styles.searchWrap}>
          <Search size={16} color={NSA.inkMuted} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar piquete"
            placeholderTextColor={NSA.inkDisabled}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear} hitSlop={10}>
              <X size={14} color={NSA.inkMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          )}
        </View>

        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = q ? paddocks.filter((p) => p.name.toLowerCase().includes(q)) : paddocks;
          if (filtered.length === 0) {
            return <Text style={styles.noMatch}>Nenhum piquete encontrado para "{search}".</Text>;
          }
          return (
            <MultiChoice
              options={filtered.map((p) => ({
                value: String(p.id),
                label: p.name,
                description: `${p.area} ha · ${p.current_heads} cab${p.current_categories ? ` · ${p.current_categories}` : ''}`,
              }))}
              value={destinoId}
              onChange={setDestinoId}
            />
          );
        })()}

      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyFooter}>
        <Button
          title={
            selectedTotal === 0
              ? 'Selecione quantidade'
              : !destinoId
                ? 'Escolha um piquete'
                : `Confirmar · ${selectedTotal} cab`
          }
          onPress={handleConfirm}
          disabled={selectedTotal === 0 || !destinoId}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NSA.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NSA.bgElevated,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: NSA.border,
  },
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
  bulkBtnPrimary: { borderColor: NSA.green800, backgroundColor: NSA.green50 },
  bulkBtnMuted: { borderColor: NSA.borderStrong, backgroundColor: NSA.bgElevated },
  bulkBtnText: { fontSize: 13, fontFamily: Fonts.semibold },
  bulkBtnTextPrimary: { color: NSA.green800 },
  bulkBtnTextMuted: { color: NSA.inkSecondary },
  catTitle: { fontSize: 13, fontFamily: Fonts.medium, color: NSA.inkPrimary },
  summaryText: { fontSize: 14, color: NSA.inkPrimary, textAlign: 'center', fontFamily: Fonts.regular },
  summaryBold: { fontFamily: Fonts.semibold },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'center' },
  warnText: { fontSize: 12, color: NSA.warnFg, fontFamily: Fonts.medium },
  empty: { fontSize: 14, color: NSA.inkMuted, textAlign: 'center', marginTop: 60, fontFamily: Fonts.regular },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NSA.bgElevated,
    borderWidth: 1,
    borderColor: NSA.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: NSA.inkPrimary, fontFamily: Fonts.regular },
  searchClear: { padding: 4 },
  noMatch: { fontSize: 13, color: NSA.inkMuted, textAlign: 'center', marginTop: 8, fontFamily: Fonts.regular },
});
